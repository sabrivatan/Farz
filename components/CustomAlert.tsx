import React from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { X } from 'lucide-react-native';

const { width } = Dimensions.get('window');

type CustomAlertProps = {
    visible: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm?: () => void;
    onCancel?: () => void;
    type?: 'info' | 'danger' | 'success'; 
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
    showCancel = true,
}: CustomAlertProps) {
    if (!visible) return null;

    const isDanger = type === 'danger';

    return (
        <Modal
            transparent
            animationType="fade"
            visible={visible}
            onRequestClose={onCancel}
        >
            <View style={styles.overlay}>
                <View style={styles.alertBox}>
                    {/* Header: Title + Close option if no cancel button provided */}
                    <View style={styles.header}>
                        <Text style={[styles.title, isDanger && styles.dangerTitle]}>{title}</Text>
                    </View>

                    {/* Content */}
                    <View style={styles.content}>
                        <Text style={styles.message}>{message}</Text>
                    </View>

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
                                isDanger ? styles.dangerButton : styles.primaryButton
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
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    alertBox: {
        width: Math.min(width - 40, 340),
        backgroundColor: '#4A3D35', // Card Dark
        borderRadius: 20,
        padding: 24,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 10,
    },
    header: {
        marginBottom: 12,
        alignItems: 'center',
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#F5F0E1', // Accent Beige
        textAlign: 'center',
    },
    dangerTitle: {
        color: '#A64D3F', // Danger
    },
    content: {
        marginBottom: 24,
    },
    message: {
        fontSize: 14,
        color: 'rgba(220, 203, 181, 0.8)', // Warm Sand / 80
        textAlign: 'center',
        lineHeight: 20,
    },
    actions: {
        flexDirection: 'row',
        gap: 12,
        justifyContent: 'center',
    },
    button: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    primaryButton: {
        backgroundColor: '#CD853F', // Primary
    },
    dangerButton: {
        backgroundColor: '#A64D3F', // Danger
    },
    cancelButton: {
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    confirmButtonText: {
        color: '#F5F0E1',
        fontWeight: 'bold',
        fontSize: 14,
    },
    cancelButtonText: {
        color: 'rgba(220, 203, 181, 0.6)', 
        fontWeight: '600',
        fontSize: 14,
    },
});
