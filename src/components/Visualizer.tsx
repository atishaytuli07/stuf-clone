import { useEffect, useRef } from 'react';

interface VisualizerProps {
    analyser: AnalyserNode | null;
    isPlaying: boolean;
}

export const Visualizer = ({ analyser, isPlaying }: VisualizerProps) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const requestRef = useRef<number | undefined>(undefined);

    useEffect(() => {
        if (!isPlaying || !analyser || !canvasRef.current) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const draw = () => {
            requestRef.current = requestAnimationFrame(draw);
            analyser.getByteFrequencyData(dataArray);

            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Calculate Average Volume
            let sum = 0;
            for (let i = 0; i < bufferLength; i++) {
                sum += dataArray[i];
            }
            const average = sum / bufferLength;

            const centerX = canvas.width / 2;
            const centerY = canvas.height / 2;

            // Pulse Effect
            // Base radius + volume modifier
            const baseRadius = 120; // Slightly larger than emoji
            const scale = 1 + (average / 256) * 1.5; // Scale factor

            // Draw Glow
            ctx.beginPath();
            ctx.arc(centerX, centerY, baseRadius * scale, 0, 2 * Math.PI);
            const gradient = ctx.createRadialGradient(centerX, centerY, baseRadius, centerX, centerY, baseRadius * scale * 1.5);
            gradient.addColorStop(0, 'rgba(255, 50, 50, 0.0)'); // Inner transparent
            gradient.addColorStop(0.5, 'rgba(255, 50, 50, 0.1)'); // Red tint
            gradient.addColorStop(1, 'rgba(255, 50, 50, 0.0)'); // Outer fade
            ctx.fillStyle = gradient;
            ctx.fill();

            // Draw Clean Ring
            ctx.beginPath();
            ctx.arc(centerX, centerY, baseRadius * scale, 0, 2 * Math.PI);
            ctx.lineWidth = 2;
            ctx.strokeStyle = `rgba(255, 50, 50, ${0.3 + (average / 256)})`; // Dynamic opacity
            ctx.stroke();
        };

        draw();

        return () => {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        };
    }, [analyser, isPlaying]);

    // Resize handler
    useEffect(() => {
        const handleResize = () => {
            if (canvasRef.current) {
                canvasRef.current.width = window.innerWidth;
                canvasRef.current.height = window.innerHeight;
            }
        };
        window.addEventListener('resize', handleResize);
        handleResize();
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return (
        <canvas
            ref={canvasRef}
            style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                pointerEvents: 'none',
                zIndex: 15
            }}
        />
    );
};
