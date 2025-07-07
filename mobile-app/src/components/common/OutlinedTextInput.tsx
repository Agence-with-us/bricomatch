import React, { useState } from "react";
import { TextInput, TextInputProps } from "react-native-paper";
import { StyleSheet } from "react-native";

interface OutlinedTextInputProps extends Omit<TextInputProps, "mode"> {
    label?: string;
    placeholder?: string;
    value: string;
    onChangeText: (text: string) => void;
    secureTextEntry?: boolean;
    keyboardType?: TextInputProps["keyboardType"];
}

export default function OutlinedTextInput({
    label,
    placeholder,
    value,
    onChangeText,
    keyboardType,
    secureTextEntry,
    ...props
}: OutlinedTextInputProps) {
    const [isSecure, setIsSecure] = useState(secureTextEntry ?? false);

    return (
        <TextInput
            label={label}
            placeholder={placeholder}
            value={value}
            onChangeText={onChangeText}
            keyboardType={keyboardType}
            secureTextEntry={isSecure}
            mode="outlined"
            autoCapitalize="none"
            activeOutlineColor="#313131"
            textColor="#313131"
            allowFontScaling={false}
            outlineStyle={styles.input}
            style={styles.container}
            right={
                secureTextEntry ? (
                    <TextInput.Icon
                        icon={isSecure ? "eye-off" : "eye"}
                        onPress={() => setIsSecure(!isSecure)}
                        forceTextInputFocus={false}
                    />
                ) : null
            }
            {...props}
        />
    );
}

const styles = StyleSheet.create({
    input: {
        borderRadius: 30,
        backgroundColor: "#EBEDEF",
        borderWidth: 0.5,
        borderColor: "#7E8184",
    },
    container: {
        marginVertical: 10,
    },
});
