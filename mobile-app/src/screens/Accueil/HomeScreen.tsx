import React from 'react';
import { View} from 'react-native';

import ProUsersList from '../../components/elements/users/ProUsersList';


const HomeScreen = () => {

   
    return (
        <View >
            <ProUsersList avecHeader={true} />
        </View>
    );
};



export default HomeScreen;