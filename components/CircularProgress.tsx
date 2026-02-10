import React from 'react';
import { View, Text } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

interface CircularProgressProps {
  size?: number;
  strokeWidth?: number;
  progress: number; // 0 to 100
  color?: string;
  trackColor?: string;
  textColor?: string;
  label?: string;
  subLabel?: string;
  labelColor?: string;
  subLabelColor?: string;
  showPercentage?: boolean;
}

export default function CircularProgress({ 
  size = 120, 
  strokeWidth = 10, 
  progress, 
  color = "#00C853",
  trackColor = "#E0F2F1",
  textColor = "#1e293b",
  label,
  subLabel,
  labelColor = "#64748b",
  subLabelColor = "#1e293b",
  showPercentage = true
}: CircularProgressProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <View className="items-center justify-center">
      {/* Container for SVG and absolute text */}
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <Svg width={size} height={size}>
            {/* Background Circle */}
            <Circle
                stroke={trackColor}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                strokeWidth={strokeWidth}
                fill="none"
            />
            {/* Progress Circle */}
            <Circle
                stroke={color}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                strokeWidth={strokeWidth}
                fill="none"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                rotation="-90"
                origin={`${size / 2}, ${size / 2}`}
            />
        </Svg>
        {showPercentage && (
            <View className="absolute items-center justify-center">
                <Text 
                    className="text-2xl font-bold"
                    style={{ color: textColor }}
                >
                    %{Math.round(progress)}
                </Text>
            </View>
        )}
      </View>
      
      {/* Labels below the circle (Only if props provided) */}
      {(label || subLabel) && (
        <View className="items-center mt-4">
            {label && (
                <Text 
                    className="text-xs font-bold uppercase tracking-widest mb-1"
                    style={{ color: labelColor }}
                >
                    {label}
                </Text>
            )}
            {subLabel && (
                <Text 
                    className="text-lg font-bold"
                    style={{ color: subLabelColor }}
                >
                    {subLabel}
                </Text>
            )}
        </View>
      )}
    </View>
  );
}
