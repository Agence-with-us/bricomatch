import { Image, Text, TouchableOpacity } from "react-native";
import { View } from "react-native";
import { navigate } from "../../../services/navigationService";
import Icon from "react-native-vector-icons/Ionicons";
import HomeListServices from "./HomeListServices";

const splashOrangeOffset = require("./../../../../assets/splash-bg-offset-orange.png");
const homeArtisan = require("./../../../../assets/validation/home-artisan.png");



const HomeHeader = () => (
  <View className="bg-background px-2.5 gap-y-3">
    <Image
      source={splashOrangeOffset}
      className="absolute top-0 right-0 z-0 mt-0 w-full h-[540]"
      resizeMode="stretch"
    />
    <View className="flex-row justify-between items-center pt-14">
      <View>
        <Text className="font-bold text-3xl text-muted">De qui<Text className="font-bold text-3xl text-secondary"> avez-vous</Text> </Text>
        <Text className="font-bold text-3xl text-secondary">besoin<Text className="font-bold text-3xl text-muted"> aujourd’hui ?</Text></Text>

      </View>
      <Image
        resizeMode="contain"
        source={homeArtisan}
        className="w-[80] h-[100]"
      />
    </View>
    <TouchableOpacity
      className="flex-row items-center bg-background-muted rounded-full px-4 py-2 border border-[#7E8184]/50 h-[50]"
      onPress={() => navigate("HomeSearch")}
    >
      <Icon name="search-outline" size={20} color="#313131" />
      <Text className="flex-1 text-muted/70 font-medium ml-3">
        Trouver un service
      </Text>
    </TouchableOpacity>
    <HomeListServices />
    <Text className="font-bold text-muted text-[19px]">Notre sélection d’artisans</Text>
  </View>
);

export default HomeHeader