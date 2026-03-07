<script setup lang="ts">
import { Heart, X, RefreshCw, MapPin, Navigation, Flame, ChevronLeft, ChevronRight } from "lucide-vue-next";
import type { Station, StationsApiResponse } from "~/types/station";
import GasCard from "~/components/GasCard.vue";

const USE_MOCK = false;

const MOCK_STATIONS: Station[] = [
    { id: "1", name: "Aral Tankstelle", brand: "Aral", street: "Hauptstraße", houseNumber: "12", postCode: 10115, place: "Berlin", lat: 52.52, lng: 13.405, dist: 0.4, e5: 1.789, e10: 1.759, diesel: 1.689, isOpen: true },
    { id: "2", name: "Shell Station", brand: "Shell", street: "Unter den Linden", houseNumber: "5", postCode: 10117, place: "Berlin", lat: 52.516, lng: 13.384, dist: 0.9, e5: 1.819, e10: 1.799, diesel: 1.709, isOpen: true },
    { id: "3", name: "Total Energies", brand: "TotalEnergies", street: "Alexanderplatz", houseNumber: "1", postCode: 10178, place: "Berlin", lat: 52.521, lng: 13.412, dist: 1.3, e5: 1.759, e10: 1.739, diesel: 1.659, isOpen: false },
    { id: "4", name: "Jet Tankstelle", brand: "JET", street: "Prenzlauer Allee", houseNumber: "88", postCode: 10405, place: "Berlin", lat: 52.535, lng: 13.42, dist: 2.1, e5: 1.739, e10: 1.719, diesel: 1.649, isOpen: true },
    { id: "5", name: "Esso Tankstelle", brand: "Esso", street: "Karl-Marx-Allee", houseNumber: "33", postCode: 10243, place: "Berlin", lat: 52.511, lng: 13.435, dist: 2.7, e5: 1.849, e10: false, diesel: 1.729, isOpen: true },
    { id: "6", name: "Avia Tankstelle", brand: "Avia", street: "Tempelhofer Damm", houseNumber: "2", postCode: 12101, place: "Berlin", lat: 52.476, lng: 13.384, dist: 3.9, e5: 1.769, e10: 1.749, diesel: 1.669, isOpen: true },
];

// Location state
const locationGranted = ref(false);
const locationPending = ref(!USE_MOCK);
const locationDenied = ref(false);

// Fetch — not immediate, triggered after geolocation resolves
const fetchLat = ref("");
const fetchLng = ref("");

const { data, pending, error, refresh, execute } = useFetch<StationsApiResponse>("/api/stations", {
    query: { lat: fetchLat, lng: fetchLng },
    immediate: false,
});

// Card Stack State
const stations = ref<Station[]>(USE_MOCK ? MOCK_STATIONS : []);
const currentIndex = ref(0);
const matchedStation = ref<Station | null>(null);
const showMatchOverlay = ref(false);
const swipeCount = ref(0);
const rejectedCount = ref(0);

watch(data, (d) => {
    if (d) {
        stations.value = [...d.stations];
        currentIndex.value = 0;
        matchedStation.value = null;
        showMatchOverlay.value = false;
    }
});

const visibleCards = computed(() => [0, 1, 2].map((offset) => ({ station: stations.value[currentIndex.value + offset], offset })).filter((item): item is { station: Station; offset: number } => item.station !== undefined));

const hasMoreCards = computed(() => currentIndex.value < stations.value.length);

const rateLimitCountdown = ref(0);
let rateLimitTimer: ReturnType<typeof setInterval> | null = null;

function startCountdown(seconds: number) {
    if (rateLimitTimer) clearInterval(rateLimitTimer);
    rateLimitCountdown.value = seconds;
    rateLimitTimer = setInterval(() => {
        rateLimitCountdown.value = Math.max(0, rateLimitCountdown.value - 1);
        if (rateLimitCountdown.value === 0) clearInterval(rateLimitTimer!);
    }, 1_000);
}

// Start countdown when server returns 429 with retryAfter
watch(error, (e) => {
    const retryAfter: number | undefined = (e as any)?.data?.retryAfter;
    if (typeof retryAfter === "number" && retryAfter > 0) startCountdown(retryAfter);
});

function doFetch() {
    if (rateLimitCountdown.value > 0) return;
    execute();
}

function doRefresh() {
    if (rateLimitCountdown.value > 0) return;
    refresh();
}

// Geolocation
function detectLocation() {
    if (USE_MOCK) return;
    if (!navigator.geolocation) {
        locationDenied.value = true;
        locationPending.value = false;
        return;
    }
    locationPending.value = true;
    locationDenied.value = false;
    navigator.geolocation.getCurrentPosition(
        (pos) => {
            fetchLat.value = pos.coords.latitude.toFixed(6);
            fetchLng.value = pos.coords.longitude.toFixed(6);
            locationGranted.value = true;
            locationPending.value = false;
            doFetch();
        },
        () => {
            locationPending.value = false;
            locationDenied.value = true;
        },
    );
}

onMounted(() => {
    if (!USE_MOCK) detectLocation();
});

onUnmounted(() => {
    if (rateLimitTimer) clearInterval(rateLimitTimer);
});

// Swipe Logic
const cardRefs: Record<string, InstanceType<typeof GasCard>> = {};

function handleSwipeLeft() {
    if (!hasMoreCards.value) return;
    rejectedCount.value++;
    swipeCount.value++;
    currentIndex.value++;
}

function handleSwipeRight() {
    if (!hasMoreCards.value) return;
    matchedStation.value = stations.value[currentIndex.value]!;
    showMatchOverlay.value = true;
    swipeCount.value++;
    currentIndex.value++;
}

function dismissMatch() {
    showMatchOverlay.value = false;
    matchedStation.value = null;
}

function swipeLeftButton() {
    const id = stations.value[currentIndex.value]?.id;
    if (id) cardRefs[id]?.triggerSwipe("left");
}

function swipeRightButton() {
    const id = stations.value[currentIndex.value]?.id;
    if (id) cardRefs[id]?.triggerSwipe("right");
}

// Desperation Meter
const averagePrice = computed(() => {
    const prices = stations.value
        .map((s: Station) => {
            const v = s.e5 ?? s.e10 ?? s.diesel;
            return typeof v === "number" && v > 0 ? v : null;
        })
        .filter((p: number | null): p is number => p !== null);
    if (!prices.length) return null;
    return prices.reduce((a: number, b: number) => a + b, 0) / prices.length;
});

const desperationLevel = computed(() => {
    const avg = averagePrice.value;
    if (avg === null) return 0;
    return Math.min(100, Math.max(0, ((avg - 1.4) / (2.3 - 1.4)) * 100));
});

const desperationColor = computed(() => {
    const lvl = desperationLevel.value;
    if (lvl < 30) return "text-emerald-400";
    if (lvl < 60) return "text-yellow-400";
    if (lvl < 80) return "text-orange-400";
    return "text-red-400";
});

// Share data helper
function stationShareData(station: Station) {
    const fmt = (p: number | false) => typeof p === "number" ? p.toFixed(3).replace(".", ",") + " €" : null;
    const prices = [
        station.e5 !== false && `Super: ${fmt(station.e5)}`,
        station.e10 !== false && `Super E10: ${fmt(station.e10)}`,
        station.diesel !== false && `Diesel: ${fmt(station.diesel)}`,
    ].filter(Boolean).join(" · ");

    const primary = typeof station.e5 === "number" ? station.e5
        : typeof station.e10 === "number" ? station.e10
        : typeof station.diesel === "number" ? station.diesel : null;
    const avg = averagePrice.value;
    const diff = primary !== null && avg !== null ? Math.round((primary - avg) * 100) : null;
    const tag = diff === null ? "" : diff <= -5 ? `-${Math.abs(diff)} ct` : diff >= 5 ? `+${diff} ct` : `±0 ct`;

    return {
        title: `${station.brand} in ${station.place}${tag ? ` (${tag})` : ""}`,
        text: `${station.name}, ${station.street} ${station.houseNumber}, ${station.postCode} ${station.place}\n💸${prices}\n🗺️ ${mapsLink(station)}`,
        url: window.location.origin,
    };
}

// Google Maps link helper
function mapsLink(station: Station) {
    const q = encodeURIComponent(`${station.name}, ${station.street} ${station.houseNumber}, ${station.postCode} ${station.place}`);
    return `https://www.google.com/maps/search/?api=1&query=${q}`;
}
</script>

<template>
    <div class="min-h-screen bg-[#0a0a0f] flex flex-col select-none">
        <!-- Header -->
        <header class="relative z-20 px-4 pt-4">
            <div class="max-w-sm mx-auto">
                <div
                    class="text-center mb-3 cursor-pointer"
                    @click="
                        () => {
                            currentIndex = 0;
                            swipeCount = 0;
                            rejectedCount = 0;
                        }
                    "
                >
                    <h1 class="flex items-center justify-center gap-2 text-4xl tracking-tighter">
                        <img class="w-8 h-8" src="/favicon.svg" />
                        <span class="text-red-500 font-extrabold">TankTinder</span>
                    </h1>
                    <p class="text-gray-500 mt-1 tracking-wide">Finde niedrige Spritpreise in deiner Nähe</p>
                </div>
            </div>
        </header>

        <!-- Desperation Meter -->
        <div class="px-4 pb-2">
            <div class="max-w-sm mx-auto bg-[#111118] rounded-2xl p-4 border border-white/5">
                <div class="flex items-center justify-between mb-2">
                    <div class="flex items-center gap-1">
                        <Flame class="w-4 h-4 text-gray-500 mb-0.5" />
                        <span class="text-gray-500"> Durchschnitt im Umkreis </span>
                    </div>
                    <span class="font-extrabold tabular-nums" :class="desperationColor">
                        <template v-if="averagePrice !== null"> {{ averagePrice.toFixed(3).replace(".", ",") }} € </template>
                        <template v-else>
                            <span class="text-gray-600">–</span>
                        </template>
                    </span>
                </div>

                <div class="h-1.5 bg-[#1a1a24] rounded-full overflow-hidden">
                    <div class="h-full desperation-bar rounded-full transition-all duration-700" :style="{ width: `${desperationLevel}%` }" />
                </div>
            </div>
        </div>

        <!-- Card Stack -->
        <div class="relative flex flex-col items-center justify-start px-4 overflow-x-hidden">
            <div class="relative w-full" style="max-width: 420px; min-height: 560px">
                <!-- Geolocation pending -->
                <Transition name="fade">
                    <div v-if="locationPending" class="absolute inset-0 flex flex-col items-center justify-center gap-4">
                        <MapPin class="w-10 h-10 text-yellow-400 animate-pulse" />
                        <p class="text-gray-400 text-center max-w-xs leading-relaxed">Standort wird ermittelt...</p>
                    </div>
                </Transition>

                <!-- Geolocation denied -->
                <Transition name="fade">
                    <div v-if="locationDenied && !locationPending" class="absolute inset-0 flex flex-col items-center justify-center gap-4 text-center px-4">
                        <MapPin class="w-10 h-10 text-red-400" />
                        <h3 class="text-white font-extrabold text-xl">Standort nicht verfügbar</h3>
                        <p class="text-gray-400 text-sm max-w-xs">Bitte Standortzugriff erlauben und erneut versuchen.</p>
                        <button class="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-full transition-colors text-sm" @click="detectLocation">
                            <MapPin class="w-4 h-4" />
                            Erneut versuchen
                        </button>
                    </div>
                </Transition>

                <!-- Loading -->
                <Transition name="fade">
                    <div v-if="pending && !stations.length" class="absolute inset-0 flex flex-col items-center justify-center gap-4">
                        <div class="oil-slick w-16 h-16 rounded-2xl animate-spin" />
                        <p class="text-gray-400 text-center max-w-xs leading-relaxed">Tankstellen werden geladen...</p>
                    </div>
                </Transition>

                <!-- Error -->
                <Transition name="fade">
                    <div v-if="error && !pending" class="absolute inset-0 flex flex-col items-center justify-center gap-4 text-center px-4">
                        <div class="text-5xl">💸</div>
                        <h3 class="text-white font-extrabold text-xl">Fehler beim Laden</h3>
                        <p class="text-gray-400 text-sm">
                            {{ error.message }}
                        </p>
                        <button class="flex items-center gap-2 bg-pink-600 hover:bg-pink-500 disabled:opacity-50 text-white px-4 py-2 rounded-full transition-colors text-sm" :disabled="rateLimitCountdown > 0" @click="doRefresh">
                            <RefreshCw class="w-4 h-4" />
                            {{ rateLimitCountdown > 0 ? `Warten (${rateLimitCountdown}s)` : 'Erneut versuchen' }}
                        </button>
                    </div>
                </Transition>

                <!-- Empty state -->
                <Transition name="fade">
                    <div v-if="!pending && !error && !hasMoreCards && stations.length" class="absolute inset-0 flex flex-col items-center justify-center gap-4 text-center px-4">
                        <div class="text-6xl">💀</div>
                        <h3 class="text-white font-bold text-xl">Alle Tankstellen gesehen.</h3>
                        <p class="text-gray-400 text-sm max-w-xs leading-relaxed">
                            <strong class="text-white">{{ rejectedCount }}</strong> von {{ swipeCount }} abgelehnt.
                        </p>
                        <button class="flex items-center gap-2 bg-gradient-to-r from-pink-600 to-orange-500 hover:from-pink-500 hover:to-orange-400 disabled:opacity-50 text-white font-semibold px-6 py-3 rounded-full transition-all active:scale-95 text-sm" :disabled="rateLimitCountdown > 0" @click="doRefresh">
                            <RefreshCw class="w-4 h-4" />
                            {{ rateLimitCountdown > 0 ? `Warten (${rateLimitCountdown}s)` : 'Neu laden' }}
                        </button>
                    </div>
                </Transition>

                <!-- Card Stack  -->
                <TransitionGroup name="card-stack">
                    <GasCard
                        v-for="{ station, offset } in [...visibleCards].reverse()"
                        :key="station.id"
                        :ref="
                            (el) => {
                                if (el) cardRefs[station.id] = el as InstanceType<typeof GasCard>;
                                else delete cardRefs[station.id];
                            }
                        "
                        :station="station"
                        :is-top="offset === 0"
                        :stack-offset="offset"
                        :area-average="averagePrice"
                        :share-data="stationShareData(station)"
                        @swipe-left="handleSwipeLeft"
                        @swipe-right="handleSwipeRight"
                    />
                </TransitionGroup>
            </div>

            <!-- Action Buttons -->
            <div class="flex items-center justify-center gap-6 pb-8">
                <!-- Reject -->
                <button class="w-16 h-16 rounded-full bg-[#111118] border border-white/10 flex items-center justify-center shadow-xl hover:border-red-500/50 hover:bg-red-500/10 active:scale-95 transition-all group disabled:opacity-30" :disabled="!hasMoreCards || pending" @click="swipeLeftButton">
                    <X class="w-7 h-7 text-red-400 group-hover:text-red-300 transition-colors" />
                </button>

                <!-- Stats counter -->
                <div class="text-center min-w-[72px]">
                    <div class="text-xs text-gray-600 uppercase tracking-wider mb-0.5">Gesehen</div>
                    <div class="text-xl font-black text-white tabular-nums">
                        {{ currentIndex }}
                        <span class="text-gray-600 text-sm font-normal">/ {{ stations.length }}</span>
                    </div>
                </div>

                <!-- Like -->
                <button class="w-16 h-16 rounded-full bg-[#111118] border border-white/10 flex items-center justify-center shadow-xl hover:border-pink-500/50 hover:bg-pink-500/10 active:scale-95 transition-all group disabled:opacity-30" :disabled="!hasMoreCards || pending" @click="swipeRightButton">
                    <Heart class="w-7 h-7 text-pink-400 fill-pink-400/20 group-hover:text-pink-300 group-hover:fill-pink-400/40 transition-colors" />
                </button>
            </div>
        </div>

        <Transition name="match">
            <div v-if="showMatchOverlay && matchedStation" class="fixed inset-0 z-50 overflow-y-auto" @click.self="dismissMatch">
                <!-- Backdrop blur layer -->
                <div class="fixed inset-0 bg-black/75 backdrop-blur-lg" @click="dismissMatch" />
                <!-- Backdrop red accent on top -->
                <div class="fixed inset-0 pointer-events-none" style="background: radial-gradient(ellipse at 50% 0%, rgba(220,38,38,0.3) 0%, transparent 60%)" />

                <!-- Content -->
                <div class="relative flex flex-col items-center gap-4 px-4 py-8 min-h-full justify-center">
                    <!-- Header -->
                    <div class="text-center">
                        <div class="text-5xl mb-2">💸</div>
                        <h2 class="text-3xl font-black text-white mb-1">Match!</h2>
                        <p class="text-gray-400 text-sm">Du hast eine Tankstelle gefunden</p>
                    </div>

                    <!-- Card + CTAs container -->
                    <div class="border border-white/10 rounded-3xl p-4 w-full flex flex-col gap-4" style="max-width: 452px">
                        <!-- Reuse GasCard — non-interactive, shows map + all info -->
                        <div class="relative w-full" style="height: 540px">
                            <GasCard :station="matchedStation" :is-top="false" :in-flow="true" :stack-offset="0" :area-average="averagePrice" :share-data="stationShareData(matchedStation)" @swipe-left="() => {}" @swipe-right="() => {}" />
                        </div>

                        <!-- CTAs -->
                        <div class="flex flex-col gap-3">
                            <a :href="mapsLink(matchedStation)" target="_blank" rel="noopener noreferrer" class="flex items-center justify-center gap-2 bg-gradient-to-r from-pink-600 to-orange-500 hover:from-pink-500 hover:to-orange-400 text-white font-bold py-4 px-6 rounded-2xl transition-all active:scale-95 text-sm">
                                <Navigation class="w-5 h-5" />
                                Route starten
                            </a>
                            <button class="text-gray-500 hover:text-gray-300 text-sm py-2 transition-colors" @click="dismissMatch">Schließen</button>
                        </div>
                    </div>
                </div>
            </div>
        </Transition>
    </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
    transition: opacity 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
    opacity: 0;
}

.match-enter-active {
    transition: opacity 0.25s ease;
}
.match-leave-active {
    transition: opacity 0.2s ease;
}
.match-enter-from,
.match-leave-to {
    opacity: 0;
}

.card-stack-enter-active {
    transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.card-stack-leave-active {
    transition: all 0.3s ease;
}
.card-stack-enter-from {
    opacity: 0;
    transform: scale(0.9) translateY(20px);
}
.card-stack-leave-to {
    opacity: 0;
}
</style>
