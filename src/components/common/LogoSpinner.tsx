import React, { useEffect, useRef } from 'react';
import {
    View,
    Text,
    Image,
    Animated,
    Easing,
    StyleSheet,
    Modal,
} from 'react-native';


const logoBrico = require("../../../assets/icon.png");



/**
 * Composant LogoSpinner - Spinner avec logo rotatif
 * @param {boolean} visible - Contrôle la visibilité du spinner
 * @param {string} message - Message à afficher sous le logo
 * @param {any} logoSource - Source de l'image du logo (require() ou URI)
 * @param {number} logoSize - Taille du logo (défaut: 80)
 * @param {number} rotationDuration - Durée d'une rotation complète en ms (défaut: 2000)
 * @param {string} backgroundColor - Couleur de fond du modal
 * @param {string} textColor - Couleur du texte
 * @param {object} logoStyle - Style personnalisé pour le logo
 * @param {boolean} showOverlay - Afficher l'overlay sombre (défaut: true)
 */
const LogoSpinner = ({
    visible = false,
    message = 'Chargement...',
    logoSize = 80,
    rotationDuration = 2000,
    backgroundColor = '#FFFFFF',
    textColor = '#374151',
    showOverlay = true,
}) => {
    const rotateAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            startRotation();
        } else {
            stopRotation();
        }
    }, [visible]);

    const startRotation = () => {
        rotateAnim.setValue(0);
        Animated.loop(
            Animated.timing(rotateAnim, {
                toValue: 1,
                duration: rotationDuration,
                easing: Easing.linear,
                useNativeDriver: true,
            })
        ).start();
    };

    const stopRotation = () => {
        rotateAnim.stopAnimation();
    };

    const spin = rotateAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg'],
    });

    if (!visible) return null;

    return (
        <Modal
            transparent
            animationType="fade"
            visible={visible}
            statusBarTranslucent
            
        >
            <View style={[
                styles.overlay,
                { backgroundColor: showOverlay ? 'rgba(0, 0, 0, 0.5)' : 'transparent' }
            ]}>
                <View style={[styles.container, { backgroundColor }]}>
                    <Animated.View
                        style={[
                            styles.logoContainer,
                            { transform: [{ rotate: spin }] }
                        ]}
                    >
                        <Image
                            source={logoBrico}
                            style={[
                                styles.logo,
                                { width: logoSize, height: logoSize },
                            ]}
                            className='rounded-full'
                            
                            resizeMode="contain"
                        />

                    </Animated.View>

                    {message && (
                        <Text style={[styles.message, { color: textColor }]}>
                            {message}
                        </Text>
                    )}
                </View>
            </View>
        </Modal>
    );
};



const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    container: {
        paddingHorizontal: 40,
        paddingVertical: 30,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        minWidth: 200,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 8,
    },
    fullScreenContainer: {
        flex :1,
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 9999,
    },
    logoContainer: {
        marginBottom: 20,
    },
    logo: {
        // Le style sera défini dynamiquement
    },
    defaultLogo: {
        backgroundColor: '#FF7F00',
        borderRadius: 50,
        justifyContent: 'center',
        alignItems: 'center',
    },
    defaultLogoText: {
        color: '#FFFFFF',
        fontWeight: 'bold',
        fontSize: 32,
    },
    message: {
        fontSize: 16,
        fontWeight: '500',
        textAlign: 'center',
        marginTop: 10,
    },
});

export default LogoSpinner;