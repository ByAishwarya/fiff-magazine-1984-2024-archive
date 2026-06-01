import React from "react";

function HeroSection() {
    const handleRandomIssue = async () => {
        try {
            const response = await fetch(`${import.meta.env.PUBLIC_API_URL ?? "http://localhost:8000"}/magazine_issue/`);
            if (response.ok) {
                const data = await response.json();
                const years = Object.keys(data);
                const randomYear = years[Math.floor(Math.random() * years.length)];
                const issues = data[randomYear];
                const randomIssue = issues[Math.floor(Math.random() * issues.length)];
                const slug = randomIssue.url.split("/")[4];
                window.location.href = `/magazine_issues/${slug}`;
            }
        } catch (error) {
            console.error("Error fetching random issue:", error);
        }
    };

    return (
        <section className="py-20 px-6 text-center max-w-6xl mx-auto">
            <h1 className="font-sans text-3xl md:text-4xl lg:text-5xl font-black text-gray-900 leading-tight mb-8">
                40 Years of Computer Science and Society
            </h1>
            <p className="text-gray-600 text-lg mb-2">
                The complete digital archive of{" "}
                <span className="font-semibold text-gray-900">FifF Kommunikation</span>.
                Exploring the social impact of technology since 1984.
            </p>
            <p className="text-gray-500 text-base max-w-2xl mx-auto mb-10">
                FIfF-Kommunikation is a trade journal and newsletter of the FIfF. It is
                published quarterly with changing topics from the field of computer
                science and society. The contributions are intended to stimulate
                discussion among experts and inform the interested public.
            </p>
            <button
                onClick={handleRandomIssue}
                className="inline-flex items-center gap-2 px-6 py-3 border border-gray-300 rounded-full text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-colors text-sm font-medium"
            >
                <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                </svg>
                Explore Random Issue
            </button>
        </section>
    );
}

export default HeroSection;