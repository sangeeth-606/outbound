import React, { useEffect, useRef } from "react";

const interpolateColor = (
  startColor: number[],
  endColor: number[],
  factor: number
): number[] => {
  const result = [];
  for (let i = 0; i < startColor.length; i++) {
    const start = startColor[i] ?? 0;
    const end = endColor[i] ?? 0;
    result[i] = Math.round(start + factor * (end - start));
  }
  return result;
};

const Visualizer = ({ microphone }: { microphone: MediaRecorder }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    let audioContext: AudioContext;
    let analyser: AnalyserNode;
    let animationId: number;
    
    try {
      // Create audio context
      audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const source = audioContext.createMediaStreamSource(microphone.stream);
      source.connect(analyser);

      const draw = (): void => {
        const canvas = canvasRef.current;

        if (!canvas) return;

        canvas.style.width = "100%";
        canvas.style.height = "100%";
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;

        const context = canvas.getContext("2d");
        const width = canvas.width;
        const height = canvas.height;

        animationId = requestAnimationFrame(draw);

        analyser.getByteFrequencyData(dataArray);

        if (!context) return;

        context.clearRect(0, 0, width, height);

        const barWidth = 10;
        let x = 0;
        const startColor = [19, 239, 147];
        const endColor = [20, 154, 251];

        for (const value of dataArray) {
          const barHeight = (value / 255) * height * 2;

          const interpolationFactor = value / 255;

          const color = interpolateColor(startColor, endColor, interpolationFactor);

          context.fillStyle = `rgba(${color[0]}, ${color[1]}, ${color[2]}, 0.1)`;
          context.fillRect(x, height - barHeight, barWidth, barHeight);
          x += barWidth;
        }
      };

      draw();
    } catch (error) {
      console.error("Visualizer setup error:", error);
    }
    
    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
      if (audioContext && audioContext.state !== 'closed') {
        audioContext.close();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [microphone]);

  return <canvas ref={canvasRef} width={window.innerWidth}></canvas>;
};

export default Visualizer;
