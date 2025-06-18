import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity
} from 'react-native';

const CreditCardInput = ({ 
  cardNumber = '', 
  expiryDate = '', 
  cvv = '', 
  cardholderName = '',
  showCvv = false 
}) => {
  const [isCardFlipped, setIsCardFlipped] = useState(showCvv);

  // Fonction pour détecter le type de carte
  const detectCardType = (number : any) => {
    const cleanNumber = number.replace(/\s/g, '');
    const cardPatterns = {
      visa: /^4/,
      mastercard: /^5[1-5]/,
      amex: /^3[47]/,
      discover: /^6(?:011|5)/,
    };

    for (const [type, pattern] of Object.entries(cardPatterns)) {
      if (pattern.test(cleanNumber)) {
        return type;
      }
    }
    return '';
  };



  // Fonction pour formater le numéro complet (avec espaces)
  const formatCardNumber = (number : any) => {
    if (!number) return '•••• •••• •••• ••••';
    const cleanNumber = number.replace(/\s/g, '');
    return cleanNumber.replace(/(\d{4})/g, '$1 ').trim();
  };

  const cardType = detectCardType(cardNumber);
  const displayCardNumber = cardNumber ? formatCardNumber(cardNumber) : '•••• •••• •••• ••••';

  const toggleCard = () => {
    setIsCardFlipped(!isCardFlipped);
  };

  return (
    <View style={styles.container} className='p-4'>
      {/* Aperçu visuel de la carte */}
      <TouchableOpacity 
        style={[styles.cardPreview, isCardFlipped && styles.cardFlipped]}
        onPress={toggleCard}
        activeOpacity={0.8}
      >
        {!isCardFlipped ? (
          // Face avant
          <View style={styles.cardFront}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTypeBadge}>
                {cardType ? cardType.toUpperCase() : ''}
              </Text>
            </View>
            
            <Text style={styles.cardNumberPreview}>
              {displayCardNumber}
            </Text>
            
            <View style={styles.cardFooter}>
              <View>
                <Text style={styles.cardLabel}>NOM DU TITULAIRE</Text>
                <Text style={styles.cardFooterText}>
                  {cardholderName || 'NOM PRÉNOM'}
                </Text>
              </View>
              <View>
                <Text style={styles.cardLabel}>EXPIRATION</Text>
                <Text style={styles.cardFooterText}>
                  {expiryDate || 'MM/AA'}
                </Text>
              </View>
            </View>
          </View>
        ) : (
          // Face arrière
          <View style={styles.cardBack}>
            <View style={styles.cardStrip} />
            <View style={styles.cardCvvContainer}>
              <Text style={styles.cardLabel}>CODE DE SÉCURITÉ</Text>
              <View style={styles.cardCvvBox}>
                <Text style={styles.cardCvvText}>
                  {cvv || '•••'}
                </Text>
              </View>
            </View>
          </View>
        )}
      </TouchableOpacity>


    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  cardPreview: {
    height: 200,
    borderRadius: 12,
    marginBottom: 20,
    backgroundColor: '#2C3E50',
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  cardFlipped: {
    // L'animation de flip peut être ajoutée ici si nécessaire
  },
  cardFront: {
    flex: 1,
    justifyContent: 'space-between',
  },
  cardBack: {
    flex: 1,
    justifyContent: 'space-between',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cardTypeBadge: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cardLogo: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  cardLogoText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
    fontStyle: 'italic',
  },
  cardChip: {
    width: 32,
    height: 24,
    backgroundColor: '#FFD700',
    borderRadius: 4,
    marginTop: 10,
  },
  cardNumberPreview: {
    color: '#FFF',
    fontSize: 22,
    letterSpacing: 2,
    textAlign: 'center',
    marginVertical: 20,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cardLabel: {
    color: '#AAA',
    fontSize: 10,
    marginBottom: 4,
  },
  cardFooterText: {
    color: '#FFF',
    fontSize: 14,
    textTransform: 'uppercase',
  },
  cardStrip: {
    height: 40,
    backgroundColor: '#444',
    marginVertical: 20,
  },
  cardCvvContainer: {
    alignItems: 'flex-end',
    marginRight: 10,
  },
  cardCvvBox: {
    backgroundColor: '#FFF',
    padding: 10,
    borderRadius: 4,
    width: 70,
    alignItems: 'center',
  },
  cardCvvText: {
    fontSize: 16,
  },
  cardInfo: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
  },
  cardInfoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  infoLabel: {
    fontSize: 14,
    color: '#333',
  },
  infoValue: {
    fontSize: 14,
    color: '#333',
    flex: 1,
    textAlign: 'right',
  },
  flipButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 8,
  },
  flipButtonText: {
    color: '#FFF',
    fontSize: 14,
  },
});

export default CreditCardInput;