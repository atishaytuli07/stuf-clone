import { useRef, useState, useCallback, useEffect } from 'react';

interface AudioEngineState {
    isPlaying: boolean;
    isCrazy: boolean;
    error: string | null;
}

export const useAudioEngine = () => {
    const [state, setState] = useState<AudioEngineState>({
        isPlaying: false,
        isCrazy: false,
        error: null,
    });

    const audioContextRef = useRef<AudioContext | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    
    // Nodes
    const delayNodeRef = useRef<DelayNode | null>(null);
    const gainNodeRef = useRef<GainNode | null>(null);
    const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
    const highPassRef = useRef<BiquadFilterNode | null>(null);
    const lowPassRef = useRef<BiquadFilterNode | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const oscillatorRef = useRef<OscillatorNode | null>(null);


    const start = useCallback(async () => {
        try {
            // AudioContext must be created after user gesture
            if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
                audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
            }
             
            if (audioContextRef.current.state === 'suspended') {
                await audioContextRef.current.resume();
            }

            const stream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    echoCancellation: false,
                    autoGainControl: false,
                    noiseSuppression: false,
                } 
            });
            streamRef.current = stream;

            const ctx = audioContextRef.current;
            const source = ctx.createMediaStreamSource(stream);
            sourceRef.current = source;

            // Create nodes
            const delayNode = ctx.createDelay(5.0); // Max delay 5s
            delayNode.delayTime.value = 2.0; // 2s default
            delayNodeRef.current = delayNode;

            const gainNode = ctx.createGain();
            gainNode.gain.value = 0.8;
            gainNodeRef.current = gainNode;

            // Voice Filters
            const highPass = ctx.createBiquadFilter();
            highPass.type = 'highpass';
            highPass.frequency.value = 300; // Cut rumble
            highPassRef.current = highPass;

            const lowPass = ctx.createBiquadFilter();
            lowPass.type = 'lowpass';
            lowPass.frequency.value = 3400; // Cut hiss
            lowPassRef.current = lowPass;

            const analyser = ctx.createAnalyser();
            analyser.fftSize = 256;
            analyserRef.current = analyser;

            // Connect graph
            // Connect graph
            // Source -> Delay -> Gain -> Analyser -> Destination
            source.connect(delayNode);
            delayNode.connect(gainNode);
            gainNode.connect(analyser);
            analyser.connect(ctx.destination);

            setState(prev => ({ ...prev, isPlaying: true, error: null }));

        } catch (err: any) {
            console.error('Audio Setup Error:', err);
            setState(prev => ({ 
                ...prev, 
                isPlaying: false, 
                error: err.message || 'Failed to access microphone' 
            }));
        }
    }, []);

    const enableCrazy = useCallback(() => {
        if (!state.isPlaying || !audioContextRef.current || !gainNodeRef.current) return;
        
        // 50Hz Ring Mod
        const osc = audioContextRef.current.createOscillator();
        osc.frequency.value = 50; 
        
        // Connect osc to gain.gain
        // But we want to modulate around 0, effectively multiplying. 
        // gainNode value is overridden when connected.
        osc.connect(gainNodeRef.current.gain);
        osc.start();
        oscillatorRef.current = osc;
        
        setState(prev => ({ ...prev, isCrazy: true }));
    }, [state.isPlaying]);

    const disableCrazy = useCallback(() => {
        if (oscillatorRef.current) {
            oscillatorRef.current.stop();
            oscillatorRef.current.disconnect();
            oscillatorRef.current = null;
        }
        
        // Reset gain
        if (gainNodeRef.current) {
             // We need to cancel scheduled values if any, but simplistic approach:
             gainNodeRef.current.gain.value = 0.8;
        }

        setState(prev => ({ ...prev, isCrazy: false }));
    }, []);

    const toggleCrazy = useCallback(() => {
        if (state.isCrazy) disableCrazy();
        else enableCrazy();
    }, [state.isCrazy, enableCrazy, disableCrazy]);

    const stop = useCallback(() => {
        disableCrazy(); // Clean up crazy
        if (sourceRef.current) sourceRef.current.disconnect();
        if (highPassRef.current) highPassRef.current.disconnect();
        if (lowPassRef.current) lowPassRef.current.disconnect();
        if (delayNodeRef.current) delayNodeRef.current.disconnect();
        if (gainNodeRef.current) gainNodeRef.current.disconnect();
        
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }

        if (audioContextRef.current) {
            audioContextRef.current.suspend();
        }

        setState(prev => ({ ...prev, isPlaying: false }));
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            stop();
            if (audioContextRef.current) {
                audioContextRef.current.close();
            }
        };
    }, [stop]);

    return {
        ...state,
        start,
        stop,
        toggleCrazy,
        audioContext: audioContextRef.current, // Expose for visualizer
        sourceNode: sourceRef.current, // Expose for visualizer
        analyser: analyserRef.current,
    };
};
