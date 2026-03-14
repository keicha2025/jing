import React, { useEffect, useRef } from 'react';
import WaveSurfer from 'wavesurfer.js';

const Waveform = ({ audioUrl, height = 60, events = [], jumpToTime = null }) => {
    const containerRef = useRef(null);
    const wavesurferRef = useRef(null);

    useEffect(() => {
        if (!containerRef.current) return;

        const ws = WaveSurfer.create({
            container: containerRef.current,
            waveColor: 'rgba(99, 102, 241, 0.2)',
            progressColor: '#6366f1',
            cursorColor: '#f43f5e',
            barWidth: 2,
            barGap: 3,
            barRadius: 4,
            height: height,
            normalize: true,
            minPxPerSec: 50,
        });

        wavesurferRef.current = ws;

        if (audioUrl) {
            ws.load(audioUrl);
        }

        ws.on('ready', () => {
            console.log('Waveform ready');
        });

        return () => ws.destroy();
    }, [audioUrl, height]);

    // Handle jump request
    useEffect(() => {
        if (wavesurferRef.current && jumpToTime !== null) {
            wavesurferRef.current.setTime(jumpToTime);
            wavesurferRef.current.play();
        }
    }, [jumpToTime]);

    return (
        <div style={{ position: 'relative', width: '100%' }}>
            <div
                ref={containerRef}
                style={{
                    width: '100%',
                    background: 'rgba(255, 255, 255, 0.02)',
                    borderRadius: '12px',
                    padding: '8px',
                    overflow: 'hidden'
                }}
            />
            {/* Visual markers could be added here overlaying the container if we have exact durations */}
        </div>
    );
};

export default Waveform;
