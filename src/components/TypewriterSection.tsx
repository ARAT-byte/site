"use client";

import { useEffect, useRef, useState } from "react";

export default function TypewriterSection() {
    const textToType = "COMING SOON";
    const [displayedText, setDisplayedText] = useState("");
    const [isVisible, setIsVisible] = useState(false);
    const sectionRef = useRef<HTMLElement>(null);
    const typingIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // Intersection Observer to detect when section is in view
    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                // If it crosses the 50% threshold, it's visible.
                if (entry.isIntersecting) {
                    setIsVisible(true);
                } else {
                    // Reset completely when scrolled out of view by a significant margin
                    setIsVisible(false);
                    setDisplayedText("");
                    if (typingIntervalRef.current) {
                        clearInterval(typingIntervalRef.current);
                    }
                }
            },
            {
                // Trigger when 50% of the section is visible
                threshold: 0.5,
            }
        );

        if (sectionRef.current) {
            observer.observe(sectionRef.current);
        }

        return () => {
            if (sectionRef.current) observer.unobserve(sectionRef.current);
        };
    }, []);

    // Typing Effect Logic
    useEffect(() => {
        if (isVisible) {
            let currentIndex = 0;
            // Clear any existing interval just in case
            if (typingIntervalRef.current) clearInterval(typingIntervalRef.current);

            typingIntervalRef.current = setInterval(() => {
                if (currentIndex <= textToType.length) {
                    setDisplayedText(textToType.slice(0, currentIndex));
                    currentIndex++;
                } else {
                    // Finished typing, stop interval
                    if (typingIntervalRef.current) clearInterval(typingIntervalRef.current);
                }
            }, 150); // Speed: 150ms per character
        }

        return () => {
            if (typingIntervalRef.current) clearInterval(typingIntervalRef.current);
        };
    }, [isVisible]);
    return (
        <section
            ref={sectionRef}
            // Use a gradient from transparent to black to seamlessly fade the 3D scene into the black typewriter section
            className="h-[150vh] bg-gradient-to-b from-transparent via-black to-black relative"
        >
            {/* Sticky container makes it stay in the middle of the screen while scrolling through the 150vh block */}
            <div className="sticky top-0 h-screen w-full flex flex-col items-center justify-center">
                <div
                    className={`transition-opacity duration-1000 w-full flex justify-center ${isVisible ? 'opacity-100' : 'opacity-0'
                        }`}
                >
                    {/* Applied the exact Gold color hex #d4af37 to match the 3D logo, using Poppins font */}
                    <h2 className="text-[#d4af37] font-['Poppins'] font-bold text-6xl md:text-8xl lg:text-9xl tracking-widest text-center whitespace-nowrap">
                        {displayedText}
                        <span className="animate-pulse duration-75">|</span>
                    </h2>
                </div>
            </div>
        </section>
    );
}
