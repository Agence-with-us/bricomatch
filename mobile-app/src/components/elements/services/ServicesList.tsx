import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { View, Text, Image, FlatList, ActivityIndicator, StyleSheet } from 'react-native';
import { RootState } from '../../../store/store';
import { fetchServicesRequest } from '../../../store/services/reducer';
import LogoSpinner from '../../common/LogoSpinner';

const ServicesList = () => {
    const dispatch = useDispatch();
    const { services, loading, error } = useSelector((state: RootState) => state.services);
    console.log("---------------------------------------------------")

    console.log(services)

    useEffect(() => {
        if (services.length == 0)
            dispatch(fetchServicesRequest()); // Charger les services au montage du composant
    }, [dispatch]);



    if (error) {
        return <Text style={styles.error}>Erreur: {error}</Text>;
    }

    return (<>
        <FlatList
            data={services}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
                <View style={styles.serviceContainer}>
                    <Image source={{ uri: item.imageUrl }} style={styles.image} />
                    <Text style={styles.serviceName}>{item.name}</Text>
                </View>
            )}
        />
        <LogoSpinner
            visible={loading}
            message="Traitement en cours..."
            rotationDuration={1500}

        />
    </>
    );
};

const styles = StyleSheet.create({
    serviceContainer: {
        alignItems: 'center',
        marginBottom: 20,
    },
    image: {
        width: 100,
        height: 100,
        borderRadius: 10,
    },
    serviceName: {
        marginTop: 10,
        fontSize: 18,
        fontWeight: 'bold',
    },
    error: {
        color: 'red',
        textAlign: 'center',
        marginTop: 20,
    },
});

export default ServicesList;
