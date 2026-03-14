import React, { useEffect, useRef } from 'react';

const LiveWaveform = ({ analyser }) => {
    const canvasRef = useRef(null);

    useEffect(() => {
        if (!analyser || !canvasRef.current) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        let animationId;

        const draw = () => {
            animationId = requestAnimationFrame(draw);
            analyser.getByteTimeDomainData(dataArray);

            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.lineWidth = 2;
            ctx.strokeStyle = '#6366f1';
            ctx.beginPath();

            const sliceWidth = canvas.width * 1.0 / bufferLength;
            let x = 0;

            for (let i = 0; i < bufferLength; i++) {
                const v = dataArray[i] / 128.0;
                const y = v * canvas.height / 2;

                if (i === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }

                x += sliceWidth;
            }

            ctx.lineTo(canvas.width, canvas.height / 2);
            ctx.stroke();
        };

        draw();

        return () => cancelAnimationFrame(animationId);
    }, [analyser]);

    return (
        <canvas
            ref={canvasRef}
            width={300}
            height={100}
            style={{
                width: '100%',
                height: '100px',
                background: 'rgba(255, 255, 255, 0.02)',
                borderRadius: '16px'
            }}
        />
    );
};

export default LiveWaveform;
