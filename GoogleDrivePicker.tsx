import React, { useRef, useEffect, useState } from 'react';
import { Annotation } from '../types';
import { cn } from '../lib/utils';

interface AnnotationCanvasProps {
  page: number;
  activeTool: 'pen' | 'eraser' | 'none';
  color: string;
  thickness: number;
  annotations: Annotation[];
  onSave: (annotations: Annotation[]) => void;
}

export default function AnnotationCanvas({ page, activeTool, color, thickness, annotations, onSave }: AnnotationCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [currentStroke, setCurrentStroke] = useState<{ x: number; y: number; pressure?: number }[] | null>(null);

  // Resize canvas to match parent
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const updateSize = () => {
      const parent = canvas.parentElement;
      if (parent) {
        // We use a high resolution for the canvas
        const rect = parent.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        canvas.style.width = `${rect.width}px`;
        canvas.style.height = `${rect.height}px`;
        draw();
      }
    };
    updateSize();
    const observer = new ResizeObserver(updateSize);
    if (canvas.parentElement) observer.observe(canvas.parentElement);
    window.addEventListener('resize', updateSize);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateSize);
    };
  }, []);

  // Redraw whenever annotations change
  useEffect(() => {
    draw();
  }, [annotations, currentStroke]);

  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    const renderStroke = (stroke: Annotation) => {
      if (stroke.points.length < 2) return;
      ctx.beginPath();
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.thickness * dpr;
      
      ctx.moveTo(stroke.points[0].x * dpr, stroke.points[0].y * dpr);
      for (let i = 1; i < stroke.points.length; i++) {
        // If we have pressure, we could vary the width here, but for simplicity:
        ctx.lineTo(stroke.points[i].x * dpr, stroke.points[i].y * dpr);
      }
      ctx.stroke();
    };

    // Draw saved annotations
    annotations.forEach(renderStroke);

    // Draw current active stroke
    if (currentStroke && currentStroke.length > 1) {
      const tempAnno: Annotation = {
        id: 'temp',
        type: 'pen',
        points: currentStroke,
        color: activeTool === 'eraser' ? '#ffffff00' : color, // This is just for rendering, eraser logic is different
        thickness,
        page
      };
      
      if (activeTool === 'eraser') {
        // For eraser, maybe show a preview or just handled it in pointerMove
        ctx.globalCompositeOperation = 'destination-out';
        ctx.strokeStyle = 'rgba(0,0,0,1)';
        ctx.lineWidth = thickness * 10 * dpr; // Making eraser bigger
        ctx.beginPath();
        ctx.moveTo(currentStroke[0].x * dpr, currentStroke[0].y * dpr);
        for (let i = 1; i < currentStroke.length; i++) {
          ctx.lineTo(currentStroke[i].x * dpr, currentStroke[i].y * dpr);
        }
        ctx.stroke();
        ctx.globalCompositeOperation = 'source-over';
      } else {
        renderStroke(tempAnno);
      }
    }
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    // ONLY allow pen
    if (e.pointerType !== 'pen' && activeTool !== 'none') {
      // If user tries to draw with finger, we don't start a stroke
      return;
    }
    
    if (activeTool === 'none') return;
    
    (e.currentTarget as HTMLCanvasElement).setPointerCapture(e.pointerId);
    const rect = (e.currentTarget as HTMLCanvasElement).getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setCurrentStroke([{ x, y, pressure: e.pressure }]);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!currentStroke) return;

    const rect = (e.currentTarget as HTMLCanvasElement).getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (activeTool === 'eraser') {
      // Stroke-based eraser logic: If the point is near any stroke, remove that stroke
      const eraserSize = thickness * 5;
      const hitIndex = annotations.findIndex(anno => {
        return anno.points.some(p => {
          const dx = p.x - x;
          const dy = p.y - y;
          return Math.sqrt(dx * dx + dy * dy) < eraserSize;
        });
      });

      if (hitIndex !== -1) {
        const newAnnotations = [...annotations];
        newAnnotations.splice(hitIndex, 1);
        onSave(newAnnotations);
      }
    }

    setCurrentStroke([...currentStroke, { x, y, pressure: e.pressure }]);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!currentStroke) return;
    
    if (activeTool === 'pen') {
      const newAnnotation: Annotation = {
        id: crypto.randomUUID(),
        type: 'pen',
        points: currentStroke,
        color,
        thickness,
        page
      };
      onSave([...annotations, newAnnotation]);
    }
    
    setCurrentStroke(null);
    (e.currentTarget as HTMLCanvasElement).releasePointerCapture(e.pointerId);
  };

  return (
    <canvas
      ref={canvasRef}
      className={cn(
        "absolute inset-0 z-10 touch-none",
        activeTool === 'none' ? "pointer-events-none" : "cursor-crosshair"
      )}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    />
  );
}
