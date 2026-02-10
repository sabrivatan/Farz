import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Switch, Image, Dimensions, Modal, FlatList, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useEffect, useState, useCallback, useRef } from "react";
// @ts-ignore
import { getDb } from "@/db";
import { 
    Trash2, User, Moon, Bell, MapPin, Globe, CloudUpload, Info, Shield, 
    ChevronRight, ChevronLeft, Pencil, LogOut, Calculator, X, Check, Map as MapIcon, LocateFixed
} from "lucide-react-native";
import { useRouter, useFocusEffect } from "expo-router";
import CustomAlert from "@/components/CustomAlert";
import MapView, { Marker, PROVIDER_DEFAULT, Region } from 'react-native-maps';
import * as Location from 'expo-location';

const { width, height } = Dimensions.get('window');

// Default initial region (Istanbul)
const INITIAL_REGION = {
    latitude: 41.0082,
    longitude: 28.9784,
    latitudeDelta: 0.1,
    longitudeDelta: 0.1,
};

export default function SettingsScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const mapRef = useRef<MapView>(null);
  
  // Toggles
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [autoLocation, setAutoLocation] = useState(true);
  
  // Manual Location
  const [manualLocation, setManualLocation] = useState<{name: string, lat: number, lng: number}>({ 
      name: 'İstanbul', 
      lat: 41.0082, 
      lng: 28.9784 
  });
  
  // Map State
  const [mapModalVisible, setMapModalVisible] = useState(false);
  const [mapRegion, setMapRegion] = useState(INITIAL_REGION);
  const [tempAddress, setTempAddress] = useState("Konum alınıyor...");
  const [isGeocoding, setIsGeocoding] = useState(false);

  // Alert State
  const [alertConfig, setAlertConfig] = useState<{
      visible: boolean;
      title: string;
      message: string;
      confirmText?: string;
      cancelText?: string;
      onConfirm?: () => void;
      onCancel?: () => void;
      type?: 'info' | 'danger' | 'success';
      showCancel?: boolean;
  }>({
      visible: false,
      title: '',
      message: '',
      confirmText: 'Tamam',
      cancelText: 'Vazgeç',
      onConfirm: () => {},
      type: 'info',
      showCancel: true
  });

  const showAlert = (
      title: string, 
      message: string, 
      onConfirm: () => void, 
      type: 'info' | 'danger' | 'success' = 'info',
      confirmText = 'Tamam',
      showCancel = true
  ) => {
      setAlertConfig({
          visible: true,
          title,
          message,
          onConfirm: () => {
              onConfirm();
              closeAlert();
          },
          onCancel: closeAlert,
          confirmText,
          cancelText: 'Vazgeç',
          type,
          showCancel
      });
  };

  const closeAlert = () => {
      setAlertConfig(prev => ({ ...prev, visible: false }));
  };

  useFocusEffect(
    useCallback(() => {
        fetchProfile();
    }, [])
  );

  const fetchProfile = async () => {
    try {
        const db = getDb();
        const result: any[] = await db.getAllAsync("SELECT * FROM profile LIMIT 1");
        if (result.length > 0) setProfile(result[0]);
    } catch (e) {
        console.error("Profile fetch error:", e);
    }
  };

  // Map Functions
  const handleMapRegionChange = async (region: Region) => {
      setMapRegion(region);
      // Debounce logic could be added here, but for simplicity call directly or on drag end
  };

  const handleMapRegionChangeComplete = async (region: Region) => {
      setMapRegion(region);
      setIsGeocoding(true);
      try {
          const result = await Location.reverseGeocodeAsync({
              latitude: region.latitude,
              longitude: region.longitude
          });

          if (result.length > 0) {
              const addr = result[0];
              const city = addr.city || addr.subregion || addr.region || addr.country || "Bilinmeyen Konum";
              const district = addr.district || addr.street || "";
              setTempAddress(`${city}${district ? `, ${district}` : ''}`);
          } else {
              setTempAddress("Konum bilgisi bulunamadı");
          }
      } catch (error) {
          console.error("Geocoding error:", error);
          setTempAddress("Adres alınamadı");
      } finally {
          setIsGeocoding(false);
      }
  };

  const confirmLocation = () => {
      setManualLocation({
          name: tempAddress,
          lat: mapRegion.latitude,
          lng: mapRegion.longitude
      });
      setMapModalVisible(false);
  };
  
  const handleOpenMap = async () => {
      // Permission check?
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
          showAlert('İzin Gerekli', 'Haritayı kullanmak için konum izni vermelisiniz.', () => {}, 'info');
          return;
      }

      // Set initial region to current manual location if specific, otherwise Istanbul
      setMapRegion({
          latitude: manualLocation.lat,
          longitude: manualLocation.lng,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
      });
      setMapModalVisible(true);
  };

  const centerUserLocation = async () => {
      try {
          const userLoc = await Location.getCurrentPositionAsync({});
          const region = {
              latitude: userLoc.coords.latitude,
              longitude: userLoc.coords.longitude,
              latitudeDelta: 0.05,
              longitudeDelta: 0.05,
          };
          mapRef.current?.animateToRegion(region, 1000);
          handleMapRegionChangeComplete(region); // Trigger update
      } catch (e) {
          showAlert("Hata", "Mevcut konum alınamadı.", () => {}, 'danger', 'Tamam', false);
      }
  };


  const handleReset = () => {
    showAlert(
        "Verileri Sıfırla",
        "Tüm kaza kayıtlarınız ve profiliniz silinecek. Bu işlem geri alınamaz. Emin misiniz?",
        async () => {
            const db = getDb();
            await db.runAsync("DELETE FROM profile");
            await db.runAsync("DELETE FROM debt_counts");
            await db.runAsync("DELETE FROM logs");
            await db.runAsync("DELETE FROM daily_status");
            
            // Re-init defaults
            const types = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha', 'witr', 'fasting'];
            for (const type of types) {
                await db.runAsync('INSERT INTO debt_counts (type, count) VALUES (?, 0)', [type]);
            }
            router.replace("/onboarding");
        },
        'danger',
        'Sıfırla'
    );
  };

  const handleRecalculate = () => {
      // Re-run wizard to edit calculations and profile
      router.push("/calculation/wizard");
  }

  const handleBackup = () => {
      showAlert("Bilgi", "Bulut yedekleme özelliği yakında eklenecek.", () => {}, 'info', 'Tamam', false);
  }

  const handleLogout = () => {
      showAlert(
          "Çıkış Yap", 
          "Oturumu kapatmak istediğinize emin misiniz?", 
          () => router.replace("/auth"), 
          'danger', 
          'Çıkış Yap'
      );
  }

  const handleLanguage = () => {
      // Simple language selection simulation
      showAlert(
          "Dil Seçimi", 
          "Şu an için sadece Türkçe dili desteklenmektedir.\n\n(İleride: TR, EN, AR)", 
          () => {}, 
          'info', 
          'Tamam', 
          false
      );
  }

  const handlePrivacy = () => {
    showAlert(
        "Gizlilik Politikası", 
        "Farz uygulaması verilerinizi sadece cihazınızda saklar. Bulut senkronizasyonu aktif değildir. Kişisel verileriniz (doğum tarihi vb.) sadece namaz vakti ve kaza hesaplaması için kullanılır.", 
        () => {}, 
        'info', 
        'Anladım', 
        false
    );
  }

  return (
    <View style={styles.container}>
        <CustomAlert 
            visible={alertConfig.visible}
            title={alertConfig.title}
            message={alertConfig.message}
            onConfirm={alertConfig.onConfirm}
            onCancel={closeAlert}
            confirmText={alertConfig.confirmText}
            cancelText={alertConfig.cancelText}
            type={alertConfig.type}
            showCancel={alertConfig.showCancel}
        />
        
        {/* Map Selection Modal */}
        <Modal
            visible={mapModalVisible}
            animationType="slide"
            onRequestClose={() => setMapModalVisible(false)}
        >
            <View style={{ flex: 1, backgroundColor: '#3E322A' }}>
                <MapView
                    ref={mapRef}
                    style={{ flex: 1 }}
                    provider={PROVIDER_DEFAULT}
                    initialRegion={mapRegion}
                    onRegionChangeComplete={handleMapRegionChangeComplete}
                    showsUserLocation
                />
                
                {/* Center Pin Overlay */}
                <View style={styles.centerPinContainer} pointerEvents="none">
                    <MapPin size={40} color="#CD853F" fill="#3E322A" />
                </View>

                {/* Top Controls */}
                <SafeAreaView style={styles.mapTopControls} pointerEvents="box-none">
                     <TouchableOpacity 
                        style={styles.closeMapButton} 
                        onPress={() => setMapModalVisible(false)}
                    >
                        <X size={24} color="#3E322A" />
                    </TouchableOpacity>
                    <TouchableOpacity 
                        style={styles.locateButton} 
                        onPress={centerUserLocation}
                    >
                        <LocateFixed size={24} color="#3E322A" />
                    </TouchableOpacity>
                </SafeAreaView>

                {/* Bottom Address Card */}
                <View style={styles.mapBottomCard}>
                     <View style={styles.dragHandle} />
                     <Text style={styles.mapLabel}>Seçilen Konum</Text>
                     <View style={styles.addressContainer}>
                         {isGeocoding ? (
                             <ActivityIndicator color="#CD853F" />
                         ) : (
                             <Text style={styles.addressText}>{tempAddress}</Text>
                         )}
                     </View>
                     <TouchableOpacity 
                        style={styles.confirmLocationButton} 
                        onPress={confirmLocation}
                     >
                         <Text style={styles.confirmLocationText}>Bu Konumu Onayla</Text>
                     </TouchableOpacity>
                </View>
            </View>
        </Modal>

        <SafeAreaView style={styles.safeArea} edges={['top']}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.headerButton} onPress={() => router.back()}>
                    <ChevronLeft color="#F5F0E1" size={24} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Ayarlar</Text>
                {/* Placeholder for balance */}
                <View style={styles.headerButton} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                
                {/* Profile Section */}
                <View style={styles.profileSection}>
                    <View style={styles.avatarContainer}>
                        <View style={styles.avatarCircle}>
                            <User size={48} color="rgba(220, 203, 181, 0.5)" />
                        </View>
                        {/* Removed Edit Button Here as requested */}
                    </View>
                    <View style={styles.profileInfo}>
                        <Text style={styles.profileName}>{profile?.name || "Misafir Kullanıcı"}</Text>
                        <Text style={styles.profileEmail}>
                            {profile?.email || "misafir@farzapp.com"}
                        </Text>
                    </View>
                </View>

                {/* Section: General */}
                <View style={styles.sectionContainer}>
                    <Text style={styles.sectionTitle}>GENEL</Text>
                    <View style={styles.card}>
                        
                        {/* Notification Toggle */}
                        <View style={styles.menuItem}>
                            <View style={styles.menuLeft}>
                                <View style={styles.iconBox}>
                                    <Bell size={20} color="#CD853F" />
                                </View>
                                <Text style={styles.menuText}>Bildirimler</Text>
                            </View>
                            <Switch
                                trackColor={{ false: "#3E322A", true: "#CD853F" }}
                                thumbColor={notificationsEnabled ? "#F5F0E1" : "#f4f3f4"}
                                ios_backgroundColor="#3E322A"
                                onValueChange={() => setNotificationsEnabled(prev => !prev)}
                                value={notificationsEnabled}
                            />
                        </View>
                        
                        <View style={styles.separator} />

                        {/* Location Toggle (Auto/Manual) */}
                        <View style={styles.menuItem}>
                            <View style={styles.menuLeft}>
                                <View style={styles.iconBox}>
                                    <MapPin size={20} color="#CD853F" />
                                </View>
                                <View>
                                    <Text style={styles.menuText}>Otomatik Konum</Text>
                                    <Text style={styles.subText}>{autoLocation ? 'GPS Kullanılıyor' : 'Manuel Seçim'}</Text>
                                </View>
                            </View>
                            <Switch
                                trackColor={{ false: "#3E322A", true: "#CD853F" }}
                                thumbColor={autoLocation ? "#F5F0E1" : "#f4f3f4"}
                                ios_backgroundColor="#3E322A"
                                onValueChange={() => setAutoLocation(prev => !prev)}
                                value={autoLocation}
                            />
                        </View>
                        
                        {/* Manual Location Selection Row (Visible only if Auto is OFF) */}
                        {!autoLocation && (
                            <>
                                <View style={styles.separator} />
                                <TouchableOpacity style={styles.menuItem} onPress={handleOpenMap}>
                                    <View style={styles.menuLeft}>
                                        <View style={[styles.iconBox, { backgroundColor: 'transparent' }]} /> 
                                        {/* Spacer */}
                                        <View style={{ flex: 1, paddingRight: 8 }}>
                                            <Text style={styles.menuText}>Seçili Konum</Text>
                                            <Text 
                                                style={[styles.subText, { color: '#CD853F' }]}
                                                numberOfLines={1}
                                            >
                                                {manualLocation.name}
                                            </Text>
                                        </View>
                                    </View>
                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        <MapIcon size={16} color="#CD853F" style={{ marginRight: 4 }} />
                                        <ChevronRight size={20} color="rgba(220, 203, 181, 0.3)" />
                                    </View>
                                </TouchableOpacity>
                            </>
                        )}


                        <View style={styles.separator} />

                        {/* Language */}
                        <TouchableOpacity style={styles.menuItem} onPress={handleLanguage}>
                            <View style={styles.menuLeft}>
                                <View style={styles.iconBox}>
                                    <Globe size={20} color="#CD853F" />
                                </View>
                                <Text style={styles.menuText}>Dil</Text>
                            </View>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                <Text style={styles.valueText}>Türkçe</Text>
                                <ChevronRight size={20} color="rgba(220, 203, 181, 0.3)" />
                            </View>
                        </TouchableOpacity>

                    </View>
                </View>

                {/* Section: Account & Data */}
                <View style={styles.sectionContainer}>
                    <Text style={styles.sectionTitle}>HESAP VE VERİ</Text>
                    <View style={styles.card}>
                        
                         {/* Recalculate */}
                         <TouchableOpacity style={styles.menuItem} onPress={handleRecalculate}>
                            <View style={styles.menuLeft}>
                                <View style={styles.iconBox}>
                                    <Calculator size={20} color="#CD853F" />
                                </View>
                                <Text style={styles.menuText}>Hesaplamayı Düzenle</Text>
                            </View>
                            <ChevronRight size={20} color="rgba(220, 203, 181, 0.3)" />
                        </TouchableOpacity>

                        <View style={styles.separator} />

                        {/* Backup */}
                        <TouchableOpacity style={styles.menuItem} onPress={handleBackup}>
                            <View style={styles.menuLeft}>
                                <View style={styles.iconBox}>
                                    <CloudUpload size={20} color="#CD853F" />
                                </View>
                                <Text style={styles.menuText}>Verileri Yedekle</Text>
                            </View>
                            <ChevronRight size={20} color="rgba(220, 203, 181, 0.3)" />
                        </TouchableOpacity>

                        <View style={styles.separator} />

                        {/* Reset Data (Danger) */}
                        <TouchableOpacity style={styles.menuItem} onPress={handleReset}>
                            <View style={styles.menuLeft}>
                                <View style={[styles.iconBox, { backgroundColor: 'rgba(166, 77, 63, 0.1)' }]}>
                                    <Trash2 size={20} color="#A64D3F" />
                                </View>
                                <Text style={[styles.menuText, { color: '#A64D3F' }]}>Verileri Sıfırla</Text>
                            </View>
                            <ChevronRight size={20} color="rgba(166, 77, 63, 0.3)" />
                        </TouchableOpacity>

                    </View>
                </View>

                {/* Section: App */}
                <View style={styles.sectionContainer}>
                    <Text style={styles.sectionTitle}>UYGULAMA</Text>
                    <View style={styles.card}>
                        
                        {/* About */}
                        <TouchableOpacity style={styles.menuItem} onPress={() => showAlert("Hakkında", "Farz v2.4.0\n\nGeliştirici: vtn.company\n\nAllah kabul etsin.", () => {}, 'info', 'Tamam', false)}>
                            <View style={styles.menuLeft}>
                                <View style={styles.iconBox}>
                                    <Info size={20} color="#CD853F" />
                                </View>
                                <Text style={styles.menuText}>Hakkında</Text>
                            </View>
                            <ChevronRight size={20} color="rgba(220, 203, 181, 0.3)" />
                        </TouchableOpacity>

                        <View style={styles.separator} />

                        {/* Privacy Policy */}
                        <TouchableOpacity style={styles.menuItem} onPress={handlePrivacy}>
                            <View style={styles.menuLeft}>
                                <View style={styles.iconBox}>
                                    <Shield size={20} color="#CD853F" />
                                </View>
                                <Text style={styles.menuText}>Gizlilik Politikası</Text>
                            </View>
                            <ChevronRight size={20} color="rgba(220, 203, 181, 0.3)" />
                        </TouchableOpacity>

                    </View>
                </View>

                {/* Logout Button */}
                <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                    <Text style={styles.logoutText}>Oturumu Kapat</Text>
                </TouchableOpacity>

                {/* Footer Info */}
                <View style={styles.footer}>
                    <Text style={styles.footerText}>Farz v2.4.0 (2024)</Text>
                </View>

            </ScrollView>
        </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#3E322A', // Deep Espresso Brown
    },
    safeArea: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: 'rgba(62, 50, 42, 0.9)', // slightly transparent
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.05)',
    },
    headerButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#F5F0E1',
    },
    scrollContent: {
        paddingHorizontal: 16,
        paddingTop: 24,
        paddingBottom: 40,
        maxWidth: 480, // max-w-md approx
        alignSelf: 'center',
        width: '100%',
    },
    profileSection: {
        alignItems: 'center',
        marginBottom: 32,
        paddingVertical: 8,
    },
    avatarContainer: {
        position: 'relative',
        marginBottom: 12,
    },
    avatarCircle: {
        width: 96, // w-24
        height: 96,
        borderRadius: 48,
        backgroundColor: '#4A3D35', // card-dark
        borderWidth: 2,
        borderColor: 'rgba(205, 133, 63, 0.3)', // primary/30
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    editButton: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: '#CD853F', // primary
        padding: 8,
        borderRadius: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 4,
    },
    profileInfo: {
        alignItems: 'center',
    },
    profileName: {
        fontSize: 20, // text-xl
        fontWeight: 'bold',
        color: '#F5F0E1', // accent-beige
        marginBottom: 4,
    },
    profileEmail: {
        fontSize: 12, // text-xs
        color: 'rgba(220, 203, 181, 0.6)', // warm-sand/60
    },
    sectionContainer: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 12, // text-xs
        fontWeight: '600',
        color: 'rgba(220, 203, 181, 0.5)', // warm-sand/50
        textTransform: 'uppercase',
        letterSpacing: 1.5, // tracking-widest
        marginLeft: 4,
        marginBottom: 8,
    },
    card: {
        backgroundColor: '#4A3D35', // card-dark
        borderRadius: 16, // rounded-2xl
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
        overflow: 'hidden',
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
    },
    menuLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1,
    },
    iconBox: {
        width: 32, // w-8
        height: 32,
        borderRadius: 8,
        backgroundColor: 'rgba(205, 133, 63, 0.1)', // primary/10
        alignItems: 'center',
        justifyContent: 'center',
    },
    menuText: {
        fontSize: 14, // text-sm
        fontWeight: '500', // font-medium
        color: '#F5F0E1', // accent-beige
    },
    subText: {
        fontSize: 10,
        color: 'rgba(220, 203, 181, 0.5)', // warm-sand/50
        marginTop: 2,
    },
    separator: {
        height: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        marginLeft: 60, // approximate indent
    },
    valueText: {
        fontSize: 12,
        color: 'rgba(220, 203, 181, 0.5)', // warm-sand/50
    },
    logoutButton: {
        paddingVertical: 16,
        alignItems: 'center',
        marginBottom: 16,
    },
    logoutText: {
        fontSize: 14,
        fontWeight: 'bold',
        color: 'rgba(220, 203, 181, 0.4)', // warm-sand/40
    },
    footer: {
        alignItems: 'center',
        marginBottom: 16,
    },
    footerText: {
        fontSize: 10,
        color: 'rgba(220, 203, 181, 0.3)', // warm-sand/30
    },
    // Map Modal Styles
    centerPinContainer: {
        position: 'absolute',
        top: '50%',
        left: '50%',
        marginLeft: -20, // half of size
        marginTop: -40, // height
        zIndex: 10,
    },
    mapTopControls: {
        position: 'absolute',
        top: 20,
        left: 20,
        right: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
        zIndex: 10,
    },
    closeMapButton: {
        width: 44,
        height: 44,
        backgroundColor: '#F5F0E1',
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    locateButton: {
        width: 44,
        height: 44,
        backgroundColor: '#F5F0E1',
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    mapBottomCard: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#3E322A',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    dragHandle: {
        width: 40,
        height: 4,
        backgroundColor: 'rgba(255,255,255,0.1)',
        alignSelf: 'center',
        borderRadius: 2,
        marginBottom: 16,
    },
    mapLabel: {
        fontSize: 12,
        color: '#CD853F',
        fontWeight: 'bold',
        marginBottom: 8,
    },
    addressContainer: {
        backgroundColor: '#4A3D35',
        padding: 16,
        borderRadius: 12,
        marginBottom: 16,
        minHeight: 60,
        justifyContent: 'center',
    },
    addressText: {
        color: '#F5F0E1',
        fontSize: 14,
        lineHeight: 20,
    },
    confirmLocationButton: {
        backgroundColor: '#CD853F',
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    confirmLocationText: {
        color: '#F5F0E1',
        fontWeight: 'bold',
        fontSize: 16,
    },
});
