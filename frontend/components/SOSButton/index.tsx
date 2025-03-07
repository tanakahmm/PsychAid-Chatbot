import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Linking,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Doctor {
  name: string;
  specialty: string;
  phone: string;
  email: string;
}

const EMERGENCY_DOCTORS: Doctor[] = [
  {
    name: "Dr. Ramesh",
    specialty: "Psychiatrist",
    phone: "+91 9393910202",
    email: "ramesh@example.com"
  },
  {
    name: "Dr. Mukesh",
    specialty: "Clinical Psychologist",
    phone: "+91 9391020202",
    email: "mukesh@example.com"
  },
  {
    name: "Dr. Suresh",
    specialty: "Mental Health Specialist",
    phone: "+91 9396910202",
    email: "suresh@example.com"
  },
];

export function SOSButton() {
  const [modalVisible, setModalVisible] = useState(false);

  const handleCall = (phoneNumber: string) => {
    Linking.openURL(`tel:${phoneNumber}`);
  };

  const handleEmail = (email: string) => {
    Linking.openURL(`mailto:${email}`);
  };

  return (
    <>
      <TouchableOpacity
        style={styles.sosButton}
        onPress={() => setModalVisible(true)}
      >
        <Ionicons name="warning" size={24} color="#fff" />
        <Text style={styles.sosButtonText}>SOS</Text>
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Emergency Contacts</Text>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.doctorsList}>
              {EMERGENCY_DOCTORS.map((doctor, index) => (
                <View key={index} style={styles.doctorCard}>
                  <Text style={styles.doctorName}>{doctor.name}</Text>
                  <Text style={styles.doctorSpecialty}>{doctor.specialty}</Text>
                  
                  <View style={styles.contactButtons}>
                    <TouchableOpacity
                      style={[styles.contactButton, styles.callButton]}
                      onPress={() => handleCall(doctor.phone)}
                    >
                      <Ionicons name="call" size={20} color="#fff" />
                      <Text style={styles.contactButtonText}>Call</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={[styles.contactButton, styles.emailButton]}
                      onPress={() => handleEmail(doctor.email)}
                    >
                      <Ionicons name="mail" size={20} color="#fff" />
                      <Text style={styles.contactButtonText}>Email</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  sosButton: {
    backgroundColor: '#FF3B30',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  sosButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    paddingHorizontal: 16,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 8,
  },
  doctorsList: {
    marginBottom: 20,
  },
  doctorCard: {
    backgroundColor: '#f5f5f5',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  doctorName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  doctorSpecialty: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  contactButtons: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 12,
  },
  contactButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    borderRadius: 8,
    gap: 8,
  },
  callButton: {
    backgroundColor: '#007AFF',
  },
  emailButton: {
    backgroundColor: '#5856D6',
  },
  contactButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
}); 