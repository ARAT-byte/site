import ThreeDScene from "@/components/ThreeDScene";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen relative overflow-hidden bg-black">
      {/* 3D Scene Container */}
      <div className="absolute inset-0 z-0 pointer-events-auto" id="canvas-container">
        <ThreeDScene />
      </div>
    </div>
  );
}
