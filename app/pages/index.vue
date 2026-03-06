<script setup lang="ts">
import { Heart, X, RefreshCw, MapPin, Navigation, Flame, Fuel } from "lucide-vue-next";
import type { Station, StationsApiResponse } from "~/types/station";
import GasCard from "~/components/GasCard.vue";

// Location & Data Fetching
const userLat = ref("52.5200");
const userLng = ref("13.4050");
const locationGranted = ref(false);
const locationPending = ref(false);
const isMockData = ref(false);

// query is a plain reactive object — useFetch watches its properties
const fetchQuery = reactive({ lat: userLat.value, lng: userLng.value });

const { data, pending, error, refresh } = await useFetch<StationsApiResponse>("/api/stations", {
    query: fetchQuery,
});

// Card Stack State
const stations = ref<Station[]>([]);
const currentIndex = ref(0);
const matchedStation = ref<Station | null>(null);
const showMatchOverlay = ref(false);
const swipeCount = ref(0);
const rejectedCount = ref(0);

// immediate: true ensures we handle data already available from SSR hydration
watch(
    data,
    (d) => {
        if (d) {
            stations.value = [...d.stations];
            currentIndex.value = 0;
            isMockData.value = d.isMock;
            matchedStation.value = null;
            showMatchOverlay.value = false;
        }
    },
    { immediate: true },
);

const visibleCards = computed(() => [0, 1, 2].map((offset) => ({ station: stations.value[currentIndex.value + offset], offset })).filter((item): item is { station: Station; offset: number } => item.station !== undefined));

const hasMoreCards = computed(() => currentIndex.value < stations.value.length);

// Geolocation
function detectLocation() {
    if (!navigator.geolocation) return;
    locationPending.value = true;
    navigator.geolocation.getCurrentPosition(
        (pos) => {
            fetchQuery.lat = pos.coords.latitude.toFixed(6);
            fetchQuery.lng = pos.coords.longitude.toFixed(6);
            locationGranted.value = true;
            locationPending.value = false;
        },
        () => {
            locationPending.value = false;
        },
    );
}

onMounted(() => {
    detectLocation();
});

// Swipe Logic
const topCardRef = ref<InstanceType<typeof GasCard> | null>(null);

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
    topCardRef.value?.triggerSwipe("left");
}

function swipeRightButton() {
    topCardRef.value?.triggerSwipe("right");
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

// Google Maps link helper
function mapsLink(station: Station) {
    const q = encodeURIComponent(`${station.name}, ${station.street} ${station.houseNumber}, ${station.postCode} ${station.place}`);
    return `https://www.google.com/maps/search/?api=1&query=${q}`;
}

// Matched station primary price helper
function primaryPriceDisplay(station: Station) {
    const p = [station.e5, station.e10, station.diesel].find((v): v is number => typeof v === "number" && v > 0);
    return p ? p.toFixed(3).replace(".", ",") + " € / L" : "Kein Preis verfügbar";
}
</script>

<template>
    <div class="min-h-screen bg-[#0a0a0f] flex flex-col select-none overflow-hidden">
        <!-- Header -->
        <header class="relative z-20 px-4 pt-4 pb-3">
            <div class="max-w-sm mx-auto">
                <div class="text-center mb-3">
                    <h1 class="flex items-center justify-center gap-2 text-4xl tracking-tighter">
                        <img class="w-8 h-8" src="/favicon.svg" />
                        <span class="text-red-500 font-extrabold">TankTinder</span>
                    </h1>
                    <p class="text-gray-500 mt-1 tracking-wide">Finde Tankstellen in deiner Nähe</p>
                </div>

                <!-- Mock data banner -->
                <Transition name="fade">
                    <div v-if="isMockData" class="text-center text-xs text-amber-400/80 bg-amber-400/10 border border-amber-400/20 rounded-full px-3 py-1.5 mb-2">
                        Demo-Modus – Beispieldaten aktiv.
                        <span class="text-amber-600"> TANKERKOENIG_API_KEY setzen für echte Preise.</span>
                    </div>
                </Transition>

                <!-- Location pill -->
                <div class="flex justify-center">
                    <button class="flex items-center gap-1.5 text-gray-400 hover:text-white transition-colors bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-full" @click="detectLocation">
                        <MapPin class="w-3 h-3 transition-colors" :class="locationGranted ? 'text-emerald-400' : locationPending ? 'text-yellow-400 animate-pulse' : ''" />
                        {{ locationGranted ? "Standort aktiv" : locationPending ? "Suche Standort..." : "Standort freigeben" }}
                    </button>
                </div>
            </div>
        </header>

        <!-- Desperation Meter -->
        <div class="px-4 pb-3 z-20">
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
        <div class="flex-1 relative flex flex-col items-center justify-start px-4">
            <div class="relative w-full" style="height: 560px; max-width: 420px">
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
                        <button class="flex items-center gap-2 bg-pink-600 hover:bg-pink-500 text-white px-4 py-2 rounded-full transition-colors text-sm" @click="() => refresh()">
                            <RefreshCw class="w-4 h-4" />
                            Erneut versuchen
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
                        <button class="flex items-center gap-2 bg-gradient-to-r from-pink-600 to-orange-500 hover:from-pink-500 hover:to-orange-400 text-white font-semibold px-6 py-3 rounded-full transition-all active:scale-95 text-sm" @click="() => refresh()">
                            <RefreshCw class="w-4 h-4" />
                            Neu laden
                        </button>
                    </div>
                </Transition>

                <!-- Card Stack  -->
                <TransitionGroup name="card-stack">
                    <GasCard
                        v-for="{ station, offset } in [...visibleCards].reverse()"
                        :key="station.id"
                        :ref="
                            offset === 0
                                ? (el) => {
                                      topCardRef = el as InstanceType<typeof GasCard>;
                                  }
                                : undefined
                        "
                        :station="station"
                        :is-top="offset === 0"
                        :stack-offset="offset"
                        :area-average="averagePrice"
                        @swipe-left="handleSwipeLeft"
                        @swipe-right="handleSwipeRight"
                    />
                </TransitionGroup>
            </div>

            <!-- Action Buttons -->
            <div class="flex items-center justify-center gap-6 mt-4 pb-8">
                <!-- Reject -->
                <button class="w-16 h-16 rounded-full bg-[#111118] border border-white/10 flex items-center justify-center shadow-xl hover:border-red-500/50 hover:bg-red-500/10 active:scale-95 transition-all group disabled:opacity-30" :disabled="!hasMoreCards || pending" @click="swipeLeftButton">
                    <X class="w-7 h-7 text-red-400 group-hover:text-red-300 transition-colors" />
                </button>

                <!-- Stats counter -->
                <div class="text-center min-w-[72px]">
                    <div class="text-xs text-gray-600 uppercase tracking-wider mb-0.5">Gematcht</div>
                    <div class="text-xl font-black text-white tabular-nums">
                        {{ swipeCount - rejectedCount }}
                        <span class="text-gray-600 text-sm font-normal">/ {{ swipeCount }}</span>
                    </div>
                </div>

                <!-- Like -->
                <button class="w-16 h-16 rounded-full bg-[#111118] border border-white/10 flex items-center justify-center shadow-xl hover:border-pink-500/50 hover:bg-pink-500/10 active:scale-95 transition-all group disabled:opacity-30" :disabled="!hasMoreCards || pending" @click="swipeRightButton">
                    <Heart class="w-7 h-7 text-pink-400 fill-pink-400/20 group-hover:text-pink-300 group-hover:fill-pink-400/40 transition-colors" />
                </button>
            </div>
        </div>

        <Transition name="match">
            <div v-if="showMatchOverlay && matchedStation" class="fixed inset-0 z-50 flex items-center justify-center p-4" @click.self="dismissMatch">
                <!-- Backdrop -->
                <div class="absolute inset-0 bg-black/80 backdrop-blur-md" />

                <!-- Match Card -->
                <div class="relative match-overlay bg-[#111118] rounded-3xl p-8 max-w-sm w-full border border-white/10 card-shadow text-center">
                    <!-- Iridescent accent bar -->
                    <div class="oil-slick h-1.5 rounded-full mb-6" />

                    <div class="text-5xl mb-3">💸</div>
                    <h2 class="text-3xl font-black text-white mb-1">It's a Match!</h2>
                    <p class="text-gray-400 text-sm mb-6">Du hast diese Tankstelle ausgewählt.</p>

                    <!-- Station info box -->
                    <div class="bg-[#1a1a24] rounded-2xl p-4 mb-6 text-left">
                        <h3 class="text-white font-bold text-base leading-tight">
                            {{ matchedStation.name }}
                        </h3>
                        <p class="text-gray-400 text-sm mt-1 flex items-center gap-1.5">
                            <MapPin class="w-3.5 h-3.5 shrink-0 text-pink-500" />
                            {{ matchedStation.street }} {{ matchedStation.houseNumber }}, {{ matchedStation.place }} {{ matchedStation.postCode }}
                        </p>
                        <div class="mt-3 pt-3 border-t border-white/5">
                            <div class="text-gray-500 text-xs uppercase tracking-wider mb-1">Preis E5</div>
                            <div class="text-2xl font-black text-white">
                                {{ primaryPriceDisplay(matchedStation) }}
                            </div>
                        </div>
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
