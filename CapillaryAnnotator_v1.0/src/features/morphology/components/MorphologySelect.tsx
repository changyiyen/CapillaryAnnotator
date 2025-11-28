import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import clsx from 'clsx';
import type { Loop } from '../../../shared/types';
import { MORPHOLOGY_OPTIONS } from '../../../shared/constants';

interface MorphologySelectProps {
    value: Loop['morphology'];
    onChange: (value: Loop['morphology']) => void;
}



export const MorphologySelect: React.FC<MorphologySelectProps> = ({ value, onChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const selectedOption = MORPHOLOGY_OPTIONS.find(opt => opt.value === value) || MORPHOLOGY_OPTIONS[0];

    return (
        <div className="relative" ref={containerRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm flex items-center justify-between hover:bg-gray-600 transition-colors"
            >
                <div className="flex items-center gap-2">
                    <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: selectedOption.color }}
                    />
                    <span>{selectedOption.label}</span>
                </div>
                <ChevronDown className="w-4 h-4 text-gray-400" />
            </button>

            {isOpen && (
                <div className="absolute z-10 w-full mt-1 bg-gray-800 border border-gray-600 rounded shadow-xl max-h-60 overflow-auto">
                    {MORPHOLOGY_OPTIONS.map((option) => (
                        <button
                            key={option.value}
                            onClick={() => {
                                onChange(option.value);
                                setIsOpen(false);
                            }}
                            className={clsx(
                                "w-full px-3 py-2 text-sm text-left flex items-center gap-2 hover:bg-gray-700 transition-colors",
                                value === option.value && "bg-gray-700"
                            )}
                        >
                            <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: option.color }}
                            />
                            <span className="text-gray-200">{option.label}</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};
