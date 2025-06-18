// components/ProUsersList.tsx
import React, { useEffect } from 'react';
import {
    View,
    Text,
    FlatList,
    ActivityIndicator,
    StyleSheet,
    Dimensions,
    TouchableOpacity
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import ProUserCard from './ProUserCard';
import { RootState } from '../../../store/store';
import { fetchProUsersByServiceRequest, fetchProUsersRequest } from '../../../store/users/reducer';
import HomeHeader from '../home/HomeHeader';
import { UserLocal } from '../../../store/users/types';
import { navigate } from '../../../services/navigationService';
import LogoSpinner from '../../common/LogoSpinner';

interface ProUsersListProps {
    serviceId?: string;
    avecHeader?: boolean;
    onUserPress?: (user: UserLocal) => void;
    style?: object;
}

const ProUsersList: React.FC<ProUsersListProps> = ({
    serviceId,
    onUserPress,
    avecHeader,
}) => {
    const dispatch = useDispatch();
    const { proUsers, proUsersByService, loading, error } = useSelector((state: RootState) => state.users);

    // Filtrer les utilisateurs par service si serviceId est fourni
    const filteredUsers = serviceId
        ? proUsersByService[serviceId]
        : proUsers;

    useEffect(() => {
        // Charger les utilisateurs PRO au montage du composant
        if (serviceId) //&& proUsersByService[serviceId]?.length == 0
            dispatch(fetchProUsersByServiceRequest(serviceId));
        else //if (proUsers.length == 0)
            dispatch(fetchProUsersRequest());

    }, [dispatch]);



    // Gérer les erreurs
    if (error) {
        return (
            <View style={styles.errorContainer}>
                <Text style={styles.errorTitle}>Erreur !</Text>
                <Text style={styles.errorMessage}>{error}</Text>
            </View>
        );
    }

    // Si aucun utilisateur trouvé
    if (!filteredUsers || filteredUsers.length === 0) {
        return (
            <View style={styles.emptyContainer}>
                <Text style={styles.emptyMessage}>
                    {serviceId
                        ? "Aucun professionnel trouvé pour ce service."
                        : "Aucun professionnel trouvé."}
                </Text>
            </View>
        );
    }

    // Rendre la liste des utilisateurs PRO
    return (
        <>
            <FlatList
                //@ts-ignore
                data={filteredUsers}
                numColumns={2} // 🔹 Affiche 2 utilisateurs par ligne
                keyExtractor={(item) => item.id}
                key={`flatlist-${2}`}
                renderItem={({ item }) => (
                    <ProUserCard
                        user={item}
                        onPress={onUserPress}
                    />
                )}
                showsVerticalScrollIndicator={false}
                ListHeaderComponent={
                    avecHeader ? <HomeHeader /> : null
                }
                ListFooterComponent={
                    avecHeader ? <TouchableOpacity
                        className="rounded-[30px] bg-secondary h-[60px] mx-5 my-5 items-center justify-center shadow-lg"
                        onPress={() => navigate('HomeSearch')}
                    >
                        <Text className="text-accent font-semibold">RECHERCHER UN ARTISAN</Text>
                    </TouchableOpacity> : null
                }

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
    listContainer: {
        padding: 8,
    },
    loaderContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 32,
    },
    errorContainer: {
        backgroundColor: '#ffebee',
        padding: 16,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#ef9a9a',
        margin: 8,
    },
    errorTitle: {
        fontWeight: 'bold',
        color: '#c62828',
        marginBottom: 4,
    },
    errorMessage: {
        color: '#c62828',
    },
    emptyContainer: {
        padding: 32,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyMessage: {
        color: '#757575',
        fontSize: 16,
        textAlign: 'center',
    },
    card: {
        marginHorizontal: 8,
        marginBottom: 12,
    }
});

export default ProUsersList;