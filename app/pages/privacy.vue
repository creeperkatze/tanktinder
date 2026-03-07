<template>
    <div class="min-h-screen bg-[#0a0a0f] text-white">
        <div class="max-w-2xl mx-auto px-4 py-12">
            <div class="mb-8">
                <NuxtLink to="/" class="text-gray-500 hover:text-gray-300 text-sm transition-colors">← Zurück</NuxtLink>
            </div>

            <h1 class="text-3xl font-black mb-2">Datenschutzerklärung</h1>
            <p class="text-gray-500 text-sm mb-10">TankTinder</p>

            <div class="space-y-8 text-gray-300 leading-relaxed">
                <section>
                    <h2 class="text-lg font-bold text-white mb-3">Verantwortlicher</h2>
                    <p>Creeperkatze<br />Kontakt: <a href="mailto:contact@creeperkatze.de" class="text-gray-400 hover:text-white transition-colors underline underline-offset-2">contact@creeperkatze.de</a></p>
                </section>

                <section>
                    <h2 class="text-lg font-bold text-white mb-3">Analyse</h2>
                    <p class="mb-3">
                        Diese Website verwendet <strong class="text-white">PostHog</strong> (PostHog, Inc.), ein Webanalysetool. Es werden die EU-Server von PostHog genutzt – die Daten werden ausschließlich innerhalb der Europäischen Union verarbeitet und gespeichert.
                    </p>
                    <p class="mb-3">Dabei werden folgende Daten erfasst:</p>
                    <ul class="list-disc list-inside space-y-1 text-gray-400 ml-2">
                        <li>Seitenaufrufe und Nutzerinteraktionen (z.&nbsp;B. Suchanfragen)</li>
                        <li>IP-Adresse (wird zur Geolokalisierung genutzt und danach anonymisiert)</li>
                        <li>Browser- und Geräteinformationen (User-Agent)</li>
                        <li>Ungefährer Standort (Stadt/Region), abgeleitet aus der IP</li>
                    </ul>
                    <p class="mt-3">
                        Die Erfassung dient ausschließlich der Verbesserung der Anwendung. Es werden keine persönlichen Profile erstellt und keine Daten an Werbeplattformen übermittelt.
                    </p>    
                </section>

                <section>
                    <h2 class="text-lg font-bold text-white mb-3">Standortdaten</h2>
                    <p>
                        Zur Anzeige naher Tankstellen wird dein Standort abgefragt. Dieser wird ausschließlich für die Tankstellen-API-Anfrage verwendet und nicht gespeichert. Alternativ kann ein ungefährer Standort per IP-Geolokalisierung (ipapi.co) ermittelt werden – auch dieser wird nicht dauerhaft gespeichert.
                    </p>
                </section>

                <section>
                    <h2 class="text-lg font-bold text-white mb-3">Deine Rechte</h2>
                    <p>
                        Du hast das Recht auf Auskunft, Berichtigung, Löschung und Einschränkung der Verarbeitung deiner Daten sowie das Recht auf Datenübertragbarkeit. Wende dich dazu an die oben genannte Kontaktadresse.
                    </p>
                </section>
            </div>

            <p class="text-gray-600 text-xs mt-12">Stand: März 2026</p>
        </div>
    </div>
</template>
