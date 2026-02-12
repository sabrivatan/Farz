import React from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { CheckCircle2, XCircle, Info, AlertTriangle } from 'lucide-react-native';

const { width } = Dimensions.get('window');

type CustomAlertProps = {
    visible: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm?: () => void;
    onCancel?: () => void;
    type?: 'info' | 'danger' | 'success' | 'warning'; 
    showCancel?: boolean;
};

export default function CustomAlert({
    visible,
    title,
    message,
    confirmText = 'Tamam',
    cancelText = 'Vazgeç',
    onConfirm,
    onCancel,
    type = 'info',
    showCancel = false,
}: CustomAlertProps) {
    if (!visible) return null;

    const getIcon = () => {
        switch (type) {
            case 'success':
                return <CheckCircle2 size={56} color="#CD853F" strokeWidth={2.5} />;
            case 'danger':
                return <XCircle size={56} color="#EF4444" strokeWidth={2.5} />;
            case 'warning':
                return <AlertTriangle size={56} color="#F59E0B" strokeWidth={2.5} />;
            case 'info':
                return <Info size={56} color="#3B82F6" strokeWidth={2.5} />;
        }
    };

    const getIconBackground = () => {
        switch (type) {
            case 'success':
                return 'rgba(205, 133, 63, 0.15)';
            case 'danger':
                return 'rgba(239, 68, 68, 0.15)';
            case 'warning':
                return 'rgba(245, 158, 11, 0.15)';
            case 'info':
                return 'rgba(59, 130, 246, 0.15)';
        }
    };

    return (
        <Modal
            transparent
            animationType="fade"
            visible={visible}
            onRequestClose={onCancel || onConfirm}
        >
            <View style={styles.overlay}>
                <View style={styles.alertBox}>
                    {/* Icon */}
                    <View 
                        style={[
                            styles.iconContainer,
                            { backgroundColor: getIconBackground() }
                        ]}
                    >
                        {getIcon()}
                    </View>

                    {/* Title */}
                    <Text style={styles.title}>{title}</Text>

                    {/* Message */}
                    <Text style={styles.message}>{message}</Text>

                    {/* Actions */}
                    <View style={styles.actions}>
                        {showCancel && (
                            <TouchableOpacity 
                                style={[styles.button, styles.cancelButton]} 
                                onPress={onCancel}
                            >
                                <Text style={styles.cancelButtonText}>{cancelText}</Text>
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity 
                            style={[
                                styles.button, 
                                styles.confirmButton,
                                showCancel && { flex: 1 }
                            ]} 
                            onPress={onConfirm}
                        >
                            <Text style={styles.confirmButtonText}>{confirmText}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 24,
    },
    alertBox: {
        width: Math.min(width - 48, 360),
        backgroundColor: '#065F46', // emerald-card
        borderRadius: 24,
        padding: 24,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4,
        shadowRadius: 16,
        elevation: 16,
        alignItems: 'center',
    },
    iconContainer: {
        width: 88,
        height: 88,
        borderRadius: 44,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#F5F0E1', // beige
        textAlign: 'center',
        marginBottom: 8,
    },
    message: {
        fontSize: 14,
        color: 'rgba(245, 240, 225, 0.7)', // beige/70
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 24,
    },
    actions: {
        flexDirection: 'row',
        gap: 12,
        width: '100%',
    },
    button: {
        paddingVertical: 14,
        paddingHorizontal: 24,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 100,
    },
    confirmButton: {
        backgroundColor: '#CD853F', // primary-terracotta
        flex: 1,
        shadowColor: '#CD853F',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    cancelButton: {
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.15)',
        flex: 1,
    },
    confirmButtonText: {
        color: '#F5F0E1',
        fontWeight: 'bold',
        fontSize: 15,
    },
    cancelButtonText: {
        color: 'rgba(245, 240, 225, 0.7)', 
        fontWeight: '600',
        fontSize: 15,
    },
});

