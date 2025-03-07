import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { router } from 'expo-router';
import { ApiService } from '../../services/api';

interface ChildInfo {
  id: string;
  name: string;
  email: string;
}

export default function SelectChildScreen() {
  const [availableChildren, setAvailableChildren] = useState<ChildInfo[]>([]);

  useEffect(() => {
    loadAvailableChildren();
  }, []);

  const loadAvailableChildren = async () => {
    try {
      const response = await ApiService.getAvailableChildren();
      setAvailableChildren(response.available_children);
    } catch (error) {
      Alert.alert('Error', 'Failed to load available children');
    }
  };

  const handleChildSelect = async (childId: string) => {
    try {
      await ApiService.linkChild(childId);
      router.replace('/parent-dashboard');
    } catch (error) {
      Alert.alert('Error', 'Failed to link child');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Select Your Child</Text>
      <Text style={styles.subtitle}>
        Available children with matching last name:
      </Text>

      <FlatList
        data={availableChildren}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.childCard}
            onPress={() => handleChildSelect(item.id)}
          >
            <Text style={styles.childName}>{item.name}</Text>
            <Text style={styles.childEmail}>{item.email}</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            No children found with matching last name
          </Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
  },
  childCard: {
    padding: 15,
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    marginBottom: 10,
  },
  childName: {
    fontSize: 18,
    fontWeight: '600',
  },
  childEmail: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
    marginTop: 20,
  },
}); 