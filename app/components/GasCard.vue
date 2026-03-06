<script setup lang="ts">
import { MapPin, Clock, Fuel, Heart, X, Flame, Zap, TrendingDown, TrendingUp, Minus } from "lucide-vue-next";
import type { Station } from "~/types/station";

const props = defineProps<{
    station: Station;
    isTop: boolean;
    stackOffset: number;
    areaAverage: number | null;
}>();

const emit = defineEmits<{
    (e: "swipe-left"): void;
    (e: "swipe-right"): void;
}>();

// ------------------------------------------------------------------
// Drag State
// ------------------------------------------------------------------
const cardRef = ref<HTMLElement | null>(null);
const isDragging = ref(false);
const startX = ref(0);
const startY = ref(0);
const currentX = ref(0);
const currentY = ref(0);
const isFlying = ref(false);
const flyDirection = ref<"left" | "right" | null>(null);

const SWIPE_THRESHOLD = 110;

const offsetX = computed(() => currentX.value - startX.value);
const offsetY = computed(() => currentY.value - startY.value);
const rotation = computed(() => offsetX.value * 0.07);
const nopeOpacity = computed(() => Math.max(0, Math.min(1, -offsetX.value / SWIPE_THRESHOLD)));
const likeOpacity = computed(() => Math.max(0, Math.min(1, offsetX.value / SWIPE_THRESHOLD)));

const stackScale = computed(() => 1 - props.stackOffset * 0.04);
const stackTranslateY = computed(() => props.stackOffset * 14);

const cardTransform = computed(() => {
    if (isFlying.value) {
        const flyX = flyDirection.value === "right" ? 1200 : -1200;
        return `translateX(${flyX}px) translateY(-80px) rotate(${flyDirection.value === "right" ? 30 : -30}deg)`;
    }
    if (!props.isTop) {
        return `scale(${stackScale.value}) translateY(${stackTranslateY.value}px)`;
    }
    return `translateX(${offsetX.value}px) translateY(${offsetY.value * 0.15}px) rotate(${rotation.value}deg)`;
});

const cardTransition = computed(() => {
    if (isDragging.value) return "none";
    if (isFlying.value) return "transform 0.45s cubic-bezier(0.55, 0, 1, 0.45)";
    return "transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)";
});

// Pointer Events
function onPointerDown(e: PointerEvent) {
    if (!props.isTop || isFlying.value) return;
    isDragging.value = true;
    startX.value = e.clientX;
    startY.value = e.clientY;
    currentX.value = e.clientX;
    currentY.value = e.clientY;
    cardRef.value?.setPointerCapture(e.pointerId);
}

function onPointerMove(e: PointerEvent) {
    if (!isDragging.value) return;
    currentX.value = e.clientX;
    currentY.value = e.clientY;
}

function onPointerUp() {
    if (!isDragging.value) return;
    isDragging.value = false;
    if (offsetX.value > SWIPE_THRESHOLD) triggerSwipe("right");
    else if (offsetX.value < -SWIPE_THRESHOLD) triggerSwipe("left");
    else {
        currentX.value = startX.value;
        currentY.value = startY.value;
    }
}

function triggerSwipe(direction: "left" | "right") {
    isFlying.value = true;
    flyDirection.value = direction;
    setTimeout(() => {
        if (direction === "right") emit("swipe-right");
        else emit("swipe-left");
    }, 420);
}

defineExpose({ triggerSwipe });

// Display helpers
const primaryPrice = computed<number | null>(() => {
    const { e5, e10, diesel } = props.station;
    if (typeof e5 === "number" && e5 > 0) return e5;
    if (typeof e10 === "number" && e10 > 0) return e10;
    if (typeof diesel === "number" && diesel > 0) return diesel;
    return null;
});

// Price vs. area average
const diffCents = computed<number | null>(() => {
    const p = primaryPrice.value;
    const avg = props.areaAverage;
    if (p === null || avg === null) return null;
    return Math.round((p - avg) * 100);
});

interface PriceBadge {
    label: string;
    colorClass: string;
}

const priceBadge = computed<PriceBadge>(() => {
    const d = diffCents.value;
    if (d === null) return { label: "Kein Vergleich", colorClass: "bg-white/5 text-gray-400" };
    if (d <= -5) return { label: `${Math.abs(d)} ct unter Schnitt`, colorClass: "bg-emerald-950 text-emerald-300 border border-emerald-800" };
    if (d >= 5) return { label: `+${d} ct über Schnitt`, colorClass: "bg-red-950 text-red-300 border border-red-800" };
    return { label: "Im Durchschnitt", colorClass: "bg-white/5 text-gray-300 border border-white/10" };
});

const diffIcon = computed(() => {
    const d = diffCents.value;
    if (d === null) return Minus;
    if (d <= -5) return TrendingDown;
    if (d >= 5) return TrendingUp;
    return Minus;
});

function formatPrice(p: number | false | null | undefined): string {
    if (typeof p !== "number") return "–";
    return p.toFixed(3).replace(".", ",") + " €";
}

const distanceLabel = computed(() => {
    const d = props.station.dist ?? 0;
    const dStr = d.toFixed(1);
    if (d < 0.3) return `${dStr} km entfernt`;
    if (d < 1.0) return `${dStr} km entfernt`;
    if (d < 5.0) return `${dStr} km entfernt`;
    return `${dStr} km entfernt`;
});

const brandInitial = computed(() => (props.station.brand || props.station.name).charAt(0).toUpperCase());

const brandDomains: Record<string, string> = {
    aral: "aral-lubricants.de",
    shell: "shell.de",
    bp: "bp.com",
    total: "totalenergies.de",
    totalenergies: "totalenergies.de",
    esso: "esso.de",
    jet: "jet.de",
    avia: "avia.de",
    agip: "agip.de",
    eni: "eni.com",
    orlen: "orlen.de",
    star: "star.de",
    hem: "hem.de",
    hoyer: "hoyer.de",
    westfalen: "westfalen-ag.de",
    neste: "neste.com",
    tamoil: "tamoil.de",
    vrplus: "vr-plus.de",
    sprint: "go-sprint.de"
};

const logoError = ref(false);

const logoUrl = computed(() => {
    const key = (props.station.brand || "").toLowerCase().replace(/\s+/g, "");
    const domain = brandDomains[key];
    if (!domain) return null;
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
});

watch(
    () => props.station.id,
    () => {
        logoError.value = false;
    },
);

type BrandAccent = { bg: string; text: string; header: string };

// Known brand colors
const brandMap: Record<string, BrandAccent> = {
    aral: { bg: "bg-blue-900", text: "text-blue-200", header: "#1e3a5f" },
    shell: { bg: "bg-yellow-900", text: "text-yellow-200", header: "#713f12" },
    bp: { bg: "bg-green-900", text: "text-green-200", header: "#14532d" },
    total: { bg: "bg-red-900", text: "text-red-200", header: "#7f1d1d" },
    totalenergies: { bg: "bg-red-900", text: "text-red-200", header: "#7f1d1d" },
    esso: { bg: "bg-sky-900", text: "text-sky-200", header: "#0c4a6e" },
    jet: { bg: "bg-orange-900", text: "text-orange-200", header: "#431407" },
    avia: { bg: "bg-red-800", text: "text-red-200", header: "#7f1d1d" },
    agip: { bg: "bg-amber-900", text: "text-amber-200", header: "#451a03" },
    eni: { bg: "bg-amber-900", text: "text-amber-200", header: "#451a03" },
    orlen: { bg: "bg-red-900", text: "text-red-200", header: "#7f1d1d" },
    star: { bg: "bg-red-900", text: "text-red-200", header: "#7f1d1d" },
    hem: { bg: "bg-orange-900", text: "text-orange-200", header: "#431407" },
    hoyer: { bg: "bg-red-900", text: "text-red-200", header: "#7f1d1d" },
    westfalen: { bg: "bg-blue-900", text: "text-blue-200", header: "#1e3a5f" },
    neste: { bg: "bg-green-900", text: "text-green-200", header: "#14532d" },
    tamoil: { bg: "bg-red-900", text: "text-red-200", header: "#7f1d1d" },
};

// Fallback palette for unknown brands
const brandFallbacks: BrandAccent[] = [
    { bg: "bg-violet-900", text: "text-violet-200", header: "#2e1065" },
    { bg: "bg-teal-900", text: "text-teal-200", header: "#134e4a" },
    { bg: "bg-rose-900", text: "text-rose-200", header: "#4c0519" },
    { bg: "bg-sky-900", text: "text-sky-200", header: "#0c4a6e" },
    { bg: "bg-amber-900", text: "text-amber-200", header: "#451a03" },
];

const brandAccent = computed<BrandAccent>(() => {
    const key = (props.station.brand || "").toLowerCase().replace(/\s+/g, "");
    return brandMap[key] ?? brandFallbacks[props.station.id.charCodeAt(props.station.id.length - 1) % brandFallbacks.length] ?? brandFallbacks[0]!;
});

const mapUrl = computed(() => {
    const { lat, lng } = props.station;
    const d = 0.004;
    return `https://www.openstreetmap.org/export/embed.html?bbox=${lng - d},${lat - d},${lng + d},${lat + d}&layer=mapnik&marker=${lat},${lng}`;
});
</script>

<template>
    <div
        ref="cardRef"
        class="absolute inset-x-0 mx-auto select-none touch-none"
        :class="isTop ? 'cursor-grab active:cursor-grabbing z-10' : `pointer-events-none z-${10 - stackOffset}`"
        style="width: min(420px, calc(100vw - 2rem))"
        :style="{ transform: cardTransform, transition: cardTransition }"
        @pointerdown="onPointerDown"
        @pointermove="onPointerMove"
        @pointerup="onPointerUp"
        @pointercancel="onPointerUp"
    >
        <div class="relative rounded-2xl overflow-hidden bg-[#111118] border border-white/[0.06]" style="height: 540px; box-shadow: 0 24px 48px -12px rgba(0, 0, 0, 0.7)">
            <!-- Brand color gradient at bottom -->
            <div class="absolute bottom-0 inset-x-0 h-28 pointer-events-none" :style="`background: linear-gradient(to top, ${brandAccent.header}dd 0%, transparent 100%)`" />

            <!-- Header -->
            <div class="h-44 relative overflow-hidden">
                <!-- OSM Embed, pointer-events deaktiviert damit Swipen funktioniert -->
                <iframe class="absolute inset-0 w-full border-0 pointer-events-none" style="height: 180%; margin-top: -10%" :src="mapUrl" loading="lazy" sandbox="allow-scripts allow-same-origin" />
                <!-- Gradient nach unten für Lesbarkeit – translateZ promotes to own layer, paints over iframe -->
                <div class="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-[#111118]" />

                <!-- Offen/Geschlossen (oben rechts) -->
                <div class="absolute top-3 right-3 flex items-center gap-1.5 text-sm px-2.5 py-1 rounded-full backdrop-blur-sm" :class="station.isOpen ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800' : 'bg-zinc-900/80 text-zinc-500 border border-zinc-700'">
                    <span class="w-1.5 h-1.5 rounded-full" :class="station.isOpen ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-600'" />
                    {{ station.isOpen ? "Geöffnet" : "Geschlossen" }}
                </div>

                <!-- Brand avatar (unten links, überlappt mit Content) -->
                <div class="absolute bottom-3 left-4 flex items-center gap-2.5">
                    <div class="w-11 h-11 rounded-xl flex items-center justify-center text-base shrink-0 shadow-lg border border-white/10 overflow-hidden" :class="[brandAccent.bg, brandAccent.text]">
                        <img v-if="logoUrl && !logoError" :src="logoUrl" :alt="station.brand" class="w-8 h-8 object-contain" @error="logoError = true" />
                        <span v-else>{{ brandInitial }}</span>
                    </div>
                    <div class="font-extrabold uppercase text-2xl">
                        {{ station.brand || "Unbekannt" }}
                    </div>
                </div>
            </div>

            <!-- Content -->
            <div class="p-5 flex flex-col gap-3">
                <!-- Name & Adresse -->
                <div>
                    <h2 class="text-xl font-extrabold text-white">
                        {{ station.name }}
                    </h2>
                    <p class="text-gray-500 mt-0.5 flex items-center gap-1.5">
                        <MapPin class="w-3.5 h-3.5 shrink-0" />
                        {{ station.street }} {{ station.houseNumber }}, {{ station.postCode }} {{ station.place }}
                    </p>
                </div>

                <!-- Preisvergleich Badge -->
                <div class="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg w-fit text-sm" :class="priceBadge.colorClass">
                    <component :is="diffIcon" class="w-3.5 h-3.5" />
                    {{ priceBadge.label }}
                </div>

                <!-- Preise -->
                <div class="grid grid-cols-3 gap-2">
                    <div class="bg-[#1a1a24] rounded-xl p-3 text-center">
                        <div class="flex items-center justify-center gap-1 text-emerald-600 text-lg mb-1.5">
                            <Flame class="w-4 h-4" />
                            <span>E5</span>
                        </div>
                        <div class="text-xl font-extrabold tabular-nums text-emerald-400">
                            {{ formatPrice(station.e5) }}
                        </div>
                    </div>

                    <div class="bg-[#1a1a24] rounded-xl p-3 text-center">
                        <div class="flex items-center justify-center gap-1 text-teal-600 text-lg mb-1.5">
                            <Zap class="w-4 h-4" />
                            <span>E10</span>
                        </div>
                        <div class="text-xl font-extrabold tabular-nums text-teal-400">
                            {{ formatPrice(station.e10) }}
                        </div>
                    </div>

                    <div class="bg-[#1a1a24] rounded-xl p-3 text-center">
                        <div class="flex items-center justify-center gap-1 text-yellow-600 text-lg mb-1.5">
                            <Fuel class="w-4 h-4" />
                            <span>Diesel</span>
                        </div>
                        <div class="text-xl font-extrabold tabular-nums text-yellow-400">
                            {{ formatPrice(station.diesel) }}
                        </div>
                    </div>
                </div>

                <!-- Entfernung + Durchschnitt -->
                <div class="grid grid-cols-2 gap-2">
                    <div class="bg-[#1a1a24] rounded-xl p-3 flex items-center gap-2">
                        <Clock class="w-4 h-4 text-gray-600 shrink-0" />
                        <span class="text-gray-400">{{ distanceLabel }}</span>
                    </div>
                    <div class="bg-[#1a1a24] rounded-xl p-3 flex items-center gap-2">
                        <span class="text-gray-500">Ø Umkreis</span>
                        <span class="text-gray-300 ml-auto tabular-nums">
                            {{ areaAverage !== null ? areaAverage.toFixed(3).replace(".", ",") + " €" : "–" }}
                        </span>
                    </div>
                </div>
            </div>

            <!-- Brand color gradient at bottom -->
            <div class="bottom-0 inset-x-0 h-160 pointer-events-none" :style="`background: linear-gradient(to top, ${brandAccent.header}cc 0%, transparent 100%)`" />

            <!-- NEIN overlay -->
            <div class="absolute inset-0 flex items-start justify-end p-7 pointer-events-none" :style="{ opacity: nopeOpacity }">
                <div class="border-2 border-red-500 text-red-400 font-black text-3xl px-4 py-2 rounded-xl rotate-12 bg-black/40 backdrop-blur-sm">
                    <div class="flex items-center gap-2">
                        <X class="w-6 h-6" />
                        NEIN
                    </div>
                </div>
            </div>

            <!-- JA overlay -->
            <div class="absolute inset-0 flex items-start justify-start p-7 pointer-events-none" :style="{ opacity: likeOpacity }">
                <div class="border-2 border-emerald-500 text-emerald-400 font-black text-3xl px-4 py-2 rounded-xl -rotate-12 bg-black/40 backdrop-blur-sm">
                    <div class="flex items-center gap-2">
                        <Heart class="w-6 h-6 fill-emerald-500" />
                        JA
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>
