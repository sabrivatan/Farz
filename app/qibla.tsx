import { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Dimensions, Platform, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft, Navigation } from 'lucide-react-native';
import Svg, { Circle, Line, Path, G, Text as SvgText } from 'react-native-svg';
import * as Location from 'expo-location';
import { DeviceMotion } from 'expo-sensors';
import { useTranslation } from 'react-i18next';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const COMPASS_SIZE = SCREEN_WIDTH * 0.75;
import { GlobalBannerAd } from '@/components/ads/GlobalBannerAd';

// Kaaba coordinates
const KAABA_LAT = 21.4225;
const KAABA_LON = 39.8262;

export default function QiblaFinder() {
    const router = useRouter();
    const { t } = useTranslation();
    const [heading, setHeading] = useState(0);
    const [qiblaDirection, setQiblaDirection] = useState(0);
    const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
    const [distance, setDistance] = useState<number | null>(null);
    const [locationName, setLocationName] = useState(t('qibla.getting_location'));
    const [permissionGranted, setPermissionGranted] = useState(false);
    
    // Animation for pulsing Qibla marker
    const pulseAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        requestPermissions();
        
        // Start pulsing animation
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, {
                    toValue: 1.3,
                    duration: 800,
                    useNativeDriver: true,
                }),
                Animated.timing(pulseAnim, {
                    toValue: 1,
                    duration: 800,
                    useNativeDriver: true,
                }),
            ])
        ).start();
    }, []);

    const requestPermissions = async () => {
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status === 'granted') {
                setPermissionGranted(true);
                getLocation();
                startCompass();
            } else {
                setLocationName(t('qibla.permission_required'));
            }
        } catch (error) {
            console.error('Permission error:', error);
        }
    };

    const getLocation = async () => {
        try {
            const loc = await Location.getCurrentPositionAsync({});
            const { latitude, longitude } = loc.coords;
            setLocation({ latitude, longitude });

            // Calculate Qibla direction
            const qibla = calculateQiblaDirection(latitude, longitude);
            setQiblaDirection(qibla);

            // Calculate distance
            const dist = calculateDistance(latitude, longitude, KAABA_LAT, KAABA_LON);
            setDistance(dist);

            // Get location name
            const geocode = await Location.reverseGeocodeAsync({ latitude, longitude });
            if (geocode.length > 0) {
                const place = geocode[0];
                setLocationName(`${place.city || place.district || place.region || t('qibla.unknown_location')}`);
            }
        } catch (error) {
            console.error('Location error:', error);
            setLocationName(t('qibla.location_error'));
        }
    };

    const startCompass = () => {
        DeviceMotion.setUpdateInterval(100);
        const subscription = DeviceMotion.addListener((data) => {
            if (data.rotation) {
                // Get heading from device rotation
                // rotation.alpha = compass heading (0-360°)
                // 0° = North, 90° = East, 180° = South, 270° = West
                const { alpha } = data.rotation;
                
                if (alpha !== null && alpha !== undefined) {
                    // Convert from radians to degrees
                    let heading = (alpha * 180 / Math.PI);
                    
                    // Normalize to 0-360
                    heading = (heading + 360) % 360;
                    
                    // On some devices, we need to invert
                    heading = (360 - heading) % 360;
                    
                    setHeading(heading);
                }
            }
        });

        return () => subscription.remove();
    };

    const calculateQiblaDirection = (lat: number, lon: number): number => {
        const latRad = (lat * Math.PI) / 180;
        const lonRad = (lon * Math.PI) / 180;
        const kaabaLatRad = (KAABA_LAT * Math.PI) / 180;
        const kaabaLonRad = (KAABA_LON * Math.PI) / 180;

        const dLon = kaabaLonRad - lonRad;

        const y = Math.sin(dLon) * Math.cos(kaabaLatRad);
        const x = Math.cos(latRad) * Math.sin(kaabaLatRad) - 
                  Math.sin(latRad) * Math.cos(kaabaLatRad) * Math.cos(dLon);

        let bearing = Math.atan2(y, x) * (180 / Math.PI);
        bearing = (bearing + 360) % 360;

        return bearing;
    };

    const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
        const R = 6371; // Earth's radius in km
        const dLat = ((lat2 - lat1) * Math.PI) / 180;
        const dLon = ((lon2 - lon1) * Math.PI) / 180;

        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                  Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
                  Math.sin(dLon / 2) * Math.sin(dLon / 2);

        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    };

    // Compass rotates with device heading (no offset)
    const compassRotation = -heading;
    
    // Calculate angle difference between current heading and Qibla
    let angleDiff = qiblaDirection - heading;
    // Normalize to -180 to 180
    while (angleDiff > 180) angleDiff -= 360;
    while (angleDiff < -180) angleDiff += 360;
    
    // Check if aligned (within 5 degrees)
    const isAligned = Math.abs(angleDiff) < 5;
    
    // Direction guidance
    const turnDirection = angleDiff > 0 ? 'right' : 'left';

    return (
        <View className="flex-1 bg-emerald-deep">
            <SafeAreaView className="flex-1" edges={['top']}>
                {/* Header */}
                <View className="flex-row items-center justify-between px-4 py-4 border-b border-white/10">
                    <View className="flex-row items-center gap-4">
                        <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2">
                            <ChevronLeft color="#F5F0E1" size={24} />
                        </TouchableOpacity>
                        <Text className="text-xl font-bold text-beige tracking-tight">
                            {t('qibla.title')}
                        </Text>
                    </View>
                </View>

                <View className="flex-1 items-center justify-center px-6">
                    {/* Location Info */}
                    <View className="items-center mb-6">
                        <Text className="text-beige/60 text-sm uppercase tracking-widest mb-2">
                            {t('qibla.your_location')}
                        </Text>
                        <Text className="text-beige text-xl font-bold">
                            {locationName}
                        </Text>
                        {location && (
                            <Text className="text-beige/50 text-xs mt-1">
                                {location.latitude.toFixed(4)}°, {location.longitude.toFixed(4)}°
                            </Text>
                        )}
                    </View>

                    {/* Alignment Status */}
                    {isAligned ? (
                        <View className="bg-emerald-card px-6 py-3 rounded-2xl border-2 border-primary mb-4">
                            <Text className="text-primary text-lg font-bold text-center">
                                {t('qibla.aligned')}
                            </Text>
                        </View>
                    ) : (
                        <View className="bg-emerald-card px-6 py-3 rounded-2xl border border-white/10 mb-4">
                            <Text className="text-beige/80 text-base text-center font-semibold">
                                {t('qibla.align_instruction')}
                            </Text>
                            <Text className="text-beige/60 text-xs text-center mt-1">
                                {turnDirection === 'right' ? t('qibla.turn_right') : t('qibla.turn_left')}
                            </Text>
                        </View>
                    )}

                    {/* Compass */}
                    <View className="items-center justify-center mb-6">
                        <Svg width={COMPASS_SIZE} height={COMPASS_SIZE}>
                            {/* Rotating compass rose + Qibla marker */}
                            <G rotation={compassRotation} origin={`${COMPASS_SIZE / 2}, ${COMPASS_SIZE / 2}`}>
                                {/* Compass Circle */}
                                <Circle
                                    cx={COMPASS_SIZE / 2}
                                    cy={COMPASS_SIZE / 2}
                                    r={COMPASS_SIZE / 2 - 10}
                                    fill="rgba(5, 41, 34, 0.6)"
                                    stroke="rgba(245, 240, 225, 0.2)"
                                    strokeWidth="2"
                                />

                                {/* Cardinal Directions */}
                                {['N', 'E', 'S', 'W'].map((dir, index) => {
                                    const angle = index * 90;
                                    const rad = (angle * Math.PI) / 180;
                                    const x = COMPASS_SIZE / 2 + (COMPASS_SIZE / 2 - 35) * Math.sin(rad);
                                    const y = COMPASS_SIZE / 2 - (COMPASS_SIZE / 2 - 35) * Math.cos(rad);
                                    return (
                                        <SvgText
                                            key={dir}
                                            x={x}
                                            y={y}
                                            fontSize="18"
                                            fontWeight="bold"
                                            fill="rgba(245, 240, 225, 0.6)"
                                            textAnchor="middle"
                                            alignmentBaseline="middle"
                                        >
                                            {dir}
                                        </SvgText>
                                    );
                                })}

                                {/* Degree Markers */}
                                {Array.from({ length: 72 }).map((_, i) => {
                                    const angle = i * 5;
                                    const rad = (angle * Math.PI) / 180;
                                    const x1 = COMPASS_SIZE / 2 + (COMPASS_SIZE / 2 - 15) * Math.sin(rad);
                                    const y1 = COMPASS_SIZE / 2 - (COMPASS_SIZE / 2 - 15) * Math.cos(rad);
                                    const x2 = COMPASS_SIZE / 2 + (COMPASS_SIZE / 2 - (angle % 30 === 0 ? 25 : 20)) * Math.sin(rad);
                                    const y2 = COMPASS_SIZE / 2 - (COMPASS_SIZE / 2 - (angle % 30 === 0 ? 25 : 20)) * Math.cos(rad);
                                    return (
                                        <Line
                                            key={i}
                                            x1={x1}
                                            y1={y1}
                                            x2={x2}
                                            y2={y2}
                                            stroke="rgba(245, 240, 225, 0.3)"
                                            strokeWidth={angle % 30 === 0 ? 2 : 1}
                                        />
                                    );
                                })}

                                {/* Qibla Marker (rotates with compass at Qibla direction) */}
                                <G rotation={qiblaDirection} origin={`${COMPASS_SIZE / 2}, ${COMPASS_SIZE / 2}`}>
                                    {/* Pulsing outer circle */}
                                    <Circle
                                        cx={COMPASS_SIZE / 2}
                                        cy={COMPASS_SIZE / 2 - (COMPASS_SIZE / 2 - 12)}
                                        r={14}
                                        fill="rgba(205, 133, 63, 0.3)"
                                        opacity={0.6}
                                    />
                                    
                                    {/* Inner marker */}
                                    <Circle
                                        cx={COMPASS_SIZE / 2}
                                        cy={COMPASS_SIZE / 2 - (COMPASS_SIZE / 2 - 12)}
                                        r={10}
                                        fill="#CD853F"
                                        stroke="#F5F0E1"
                                        strokeWidth="2"
                                    />
                                    
                                    {/* Kaaba icon */}
                                    <SvgText
                                        x={COMPASS_SIZE / 2}
                                        y={COMPASS_SIZE / 2 - (COMPASS_SIZE / 2 - 12)}
                                        fontSize="12"
                                        fontWeight="bold"
                                        fill="#F5F0E1"
                                        textAnchor="middle"
                                        alignmentBaseline="middle"
                                    >
                                        🕋
                                    </SvgText>
                                </G>
                            </G>

                            {/* Fixed reference line at top (target for Qibla marker) */}
                            <G>
                                {/* Top reference line */}
                                <Line
                                    x1={COMPASS_SIZE / 2 - 30}
                                    y1={COMPASS_SIZE / 2 - 95}
                                    x2={COMPASS_SIZE / 2 + 30}
                                    y2={COMPASS_SIZE / 2 - 95}
                                    stroke={isAligned ? "#10B981" : "#CD853F"}
                                    strokeWidth="4"
                                    strokeLinecap="round"
                                />
                                
                                {/* Small arrow pointing down to compass */}
                                <Path
                                    d={`M ${COMPASS_SIZE / 2} ${COMPASS_SIZE / 2 - 92}
                                        L ${COMPASS_SIZE / 2 - 6} ${COMPASS_SIZE / 2 - 85}
                                        L ${COMPASS_SIZE / 2 + 6} ${COMPASS_SIZE / 2 - 85}
                                        Z`}
                                    fill={isAligned ? "#10B981" : "#CD853F"}
                                />
                            </G>

                            {/* Center Circle */}
                            <Circle
                                cx={COMPASS_SIZE / 2}
                                cy={COMPASS_SIZE / 2}
                                r={8}
                                fill="#F5F0E1"
                            />
                        </Svg>
                        
                        {/* Heading Display */}
                        <Text className="text-beige/60 text-sm mt-3 text-center">
                            {Math.round(heading)}°
                        </Text>
                    </View>

                    {/* Usage Instructions */}
                    <View className="w-full px-4">
                        <View className="bg-emerald-card p-4 rounded-2xl border border-white/10">
                            <View className="flex-row items-center gap-2 mb-2">
                                <Navigation size={18} color="#CD853F" />
                                <Text className="text-primary text-sm font-bold uppercase tracking-widest">
                                    {t('qibla.how_to_use')}
                                </Text>
                            </View>
                            <Text className="text-beige/90 text-sm leading-relaxed">
                                <Text className="font-semibold text-primary">{t('qibla.calibration')}</Text> {t('qibla.calibration_text')}{"\n\n"}
                                <Text className="font-semibold text-primary">{t('qibla.usage')}</Text> {t('qibla.usage_text')}
                            </Text>
                        </View>
                    </View>
                </View>
                <GlobalBannerAd />
                </SafeAreaView>
            </View>
    );
}
