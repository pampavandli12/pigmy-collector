import { ScrollView, StyleSheet, View } from "react-native";
import { Card, IconButton, Text } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

interface SupportOption {
  id: string;
  title: string;
  description: string;
  icon: string;
  onPress: () => void;
}

export default function Support() {
  const supportOptions: SupportOption[] = [
    {
      id: "call",
      title: "Call Us",
      description: "Speak directly with a support agent.",
      icon: "phone",
      onPress: () => console.log("Call support"),
    },
    {
      id: "email",
      title: "Email Support",
      description: "Get a response within 24 hours.",
      icon: "email",
      onPress: () => console.log("Email support"),
    },
    {
      id: "ticket",
      title: "Submit a Ticket",
      description: "Fill out our contact form.",
      icon: "file-document",
      onPress: () => console.log("Submit ticket"),
    },
  ];

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header Text */}
        <Text variant="bodyLarge" style={styles.headerText}>
          Have questions or need assistance? Reach out to our support team
          through any of the methods below.
        </Text>

        {/* Support Options */}
        <View style={styles.optionsContainer}>
          {supportOptions.map((option) => (
            <Card
              key={option.id}
              style={styles.optionCard}
              onPress={option.onPress}
            >
              <Card.Content style={styles.cardContent}>
                <View style={styles.iconContainer}>
                  <IconButton
                    icon={option.icon}
                    size={28}
                    iconColor="#4A90E2"
                    style={styles.iconButton}
                  />
                </View>
                <View style={styles.textContainer}>
                  <Text variant="titleLarge" style={styles.optionTitle}>
                    {option.title}
                  </Text>
                  <Text variant="bodyMedium" style={styles.optionDescription}>
                    {option.description}
                  </Text>
                </View>
                <IconButton
                  icon="chevron-right"
                  size={24}
                  iconColor="#999"
                  style={styles.chevron}
                />
              </Card.Content>
            </Card>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  headerText: {
    color: "#666",
    textAlign: "center",
    lineHeight: 24,
    marginTop: 24,
    marginBottom: 32,
    paddingHorizontal: 8,
  },
  optionsContainer: {
    gap: 16,
    marginBottom: 24,
  },
  optionCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    elevation: 1,
  },
  cardContent: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#E3F2FD",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  iconButton: {
    margin: 0,
  },
  textContainer: {
    flex: 1,
  },
  optionTitle: {
    fontWeight: "700",
    color: "#000",
    marginBottom: 4,
  },
  optionDescription: {
    color: "#666",
    lineHeight: 20,
  },
  chevron: {
    margin: 0,
  },
});
