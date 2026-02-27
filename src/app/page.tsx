import ThreeDScene from "@/components/ThreeDScene";
import TypewriterSection from "@/components/TypewriterSection";

export default function Home() {
  return (
    <main className="flex flex-col min-h-screen bg-transparent w-full">
      {/* 3D Scene Hero Section - Fixed to background for Parallax */}
      <div className="fixed inset-0 z-0 pointer-events-none" id="canvas-container">
        <div className="w-full h-full pointer-events-auto">
          <ThreeDScene />
        </div>
      </div>

      {/* Invisible spacer to allow scrolling past the fixed 100vh hero */}
      <section className="h-screen w-full z-10 relative bg-transparent pointer-events-none"></section>

      {/* Scrollytelling Typewriter Section */}
      <div className="relative z-10 w-full bg-black">
        <TypewriterSection />
      </div>
    </main>
  );
}
