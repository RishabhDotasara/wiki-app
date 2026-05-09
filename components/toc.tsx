"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface TocProps {
  headings: { level: number; text: string; id: string }[];
}

export function TableOfContents({ headings }: TocProps) {
  const [activeId, setActiveId] = useState<string>("");

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        });
      },
      { 
        rootMargin: "-100px 0% -60% 0%", // Top margin compensates for header
        threshold: 0.5 
      }
    );

    headings.forEach((heading) => {
      const element = document.getElementById(heading.id);
      if (element) {
        observer.observe(element);
      }
    });

    return () => observer.disconnect();
  }, [headings]);

  if (headings.length === 0) return null;

  return (
    <div className="space-y-4">
      <h4 className="text-sm font-medium tracking-tight">On this page</h4>
      <ul className="text-sm space-y-2.5 text-muted-foreground">
        {headings.map((heading) => {
          const isActive = activeId === heading.id;
          return (
            <li key={heading.id}>
              <a
                href={`#${heading.id}`}
                className={cn(
                  "block hover:text-foreground transition-colors",
                  heading.level === 2 && "ml-4",
                  isActive && "text-foreground font-medium"
                )}
                onClick={(e) => {
                  e.preventDefault();
                  const el = document.getElementById(heading.id);
                  if (el) {
                    const offset = 100; // Account for sticky navbar height
                    const bodyRect = document.body.getBoundingClientRect().top;
                    const elementRect = el.getBoundingClientRect().top;
                    const elementPosition = elementRect - bodyRect;
                    const offsetPosition = elementPosition - offset;

                    window.scrollTo({
                      top: offsetPosition,
                      behavior: "smooth"
                    });
                    
                    window.history.pushState(null, "", `#${heading.id}`);
                    setActiveId(heading.id);
                  }
                }}
              >
                {heading.text}
              </a>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
