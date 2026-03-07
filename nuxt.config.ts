export default defineNuxtConfig({
    compatibilityDate: "2025-07-15",
    devtools: { enabled: true },

    modules: ["@nuxt/eslint", "@nuxt/fonts", "@nuxtjs/tailwindcss", "@vueuse/motion/nuxt"],

    tailwindcss: {
        cssPath: "~/assets/css/main.css",
    },

    runtimeConfig: {
        tankerkoenigApiKey: "",
        public: {
            posthogPublicKey: "phc_3xNgFbgJt7XXDcz3LY2nOdqeVvzW1vTXWgz3UMKxvEQ",
            posthogHost: "https://eu.i.posthog.com",
            posthogDefaults: "2026-01-30",
        },
    },

    app: {
        head: {
            title: "TankTinder - Finde Tankstellen in deiner Nähe",
            htmlAttrs: { lang: "de", class: "dark" },
            meta: [
                {
                    name: "description",
                    content: "Tinder für Tankstellen. Tankstellen in deiner Nähe warten auf dich!",
                },
                {
                    property: "og:title",
                    content: "TankTinder - Finde Tankstellen in deiner Nähe",
                },
                {
                    property: "og:description",
                    content: "Tinder für Tankstellen. Tankstellen in deiner Nähe warten auf dich!",
                },
            ],
            link: [{ rel: "icon", type: "image/svg+xml", href: "/favicon.svg" }],
        },
    },
});
