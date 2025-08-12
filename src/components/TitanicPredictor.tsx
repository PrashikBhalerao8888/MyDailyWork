import React, { useState, useEffect } from 'react';
import { Ship, User, DollarSign, Users, BarChart3, Brain } from 'lucide-react';

interface Passenger {
  PassengerId: number;
  Survived: number;
  Pclass: number;
  Name: string;
  Sex: string;
  Age: number | null;
  SibSp: number;
  Parch: number;
  Ticket: string;
  Fare: number | null;
  Cabin: string;
  Embarked: string;
}

interface ModelStats {
  accuracy: number;
  totalPassengers: number;
  survivedCount: number;
  deathCount: number;
}

interface PredictionInput {
  pclass: number;
  sex: string;
  age: number;
  sibsp: number;
  parch: number;
  fare: number;
  embarked: string;
}

const TitanicPredictor: React.FC = () => {
  const [data, setData] = useState<Passenger[]>([]);
  const [modelStats, setModelStats] = useState<ModelStats | null>(null);
  const [prediction, setPrediction] = useState<{ probability: number; survived: boolean } | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [input, setInput] = useState<PredictionInput>({
    pclass: 3,
    sex: 'male',
    age: 30,
    sibsp: 0,
    parch: 0,
    fare: 15,
    embarked: 'S'
  });

  // Load and parse CSV data
  useEffect(() => {
    const loadData = async () => {
      try {
        const response = await fetch('/src/data/tested.csv');
        const csvText = await response.text();
        const parsedData = parseCSV(csvText);
        setData(parsedData);
        calculateModelStats(parsedData);
        setLoading(false);
      } catch (error) {
        console.error('Error loading data:', error);
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const parseCSV = (csvText: string): Passenger[] => {
    const lines = csvText.trim().split('\n');
    const headers = lines[0].split(',');
    
    return lines.slice(1).map(line => {
      const values = parseCSVLine(line);
      const passenger: any = {};
      
      headers.forEach((header, index) => {
        const value = values[index]?.replace(/"/g, '') || '';
        switch (header) {
          case 'PassengerId':
          case 'Survived':
          case 'Pclass':
          case 'SibSp':
          case 'Parch':
            passenger[header] = parseInt(value) || 0;
            break;
          case 'Age':
          case 'Fare':
            passenger[header] = value ? parseFloat(value) : null;
            break;
          default:
            passenger[header] = value;
        }
      });
      
      return passenger as Passenger;
    });
  };

  const parseCSVLine = (line: string): string[] => {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current);
    return result;
  };

  const calculateModelStats = (passengers: Passenger[]) => {
    const totalPassengers = passengers.length;
    const survivedCount = passengers.filter(p => p.Survived === 1).length;
    const deathCount = totalPassengers - survivedCount;
    
    // Simple accuracy estimation based on our rule-based model
    let correctPredictions = 0;
    passengers.forEach(passenger => {
      const predicted = predictSurvival(passenger);
      if ((predicted.survived && passenger.Survived === 1) || 
          (!predicted.survived && passenger.Survived === 0)) {
        correctPredictions++;
      }
    });
    
    const accuracy = (correctPredictions / totalPassengers) * 100;
    
    setModelStats({
      accuracy,
      totalPassengers,
      survivedCount,
      deathCount
    });
  };

  // Simple rule-based prediction model
  const predictSurvival = (passenger: Partial<Passenger>): { probability: number; survived: boolean } => {
    let score = 0.5; // Base survival probability
    
    // Gender (strongest predictor)
    if (passenger.Sex === 'female') {
      score += 0.35;
    } else {
      score -= 0.25;
    }
    
    // Class
    if (passenger.Pclass === 1) {
      score += 0.2;
    } else if (passenger.Pclass === 2) {
      score += 0.05;
    } else {
      score -= 0.15;
    }
    
    // Age
    const age = passenger.Age || 30;
    if (age < 16) {
      score += 0.1; // Children more likely to survive
    } else if (age > 60) {
      score -= 0.1; // Elderly less likely to survive
    }
    
    // Family size
    const familySize = (passenger.SibSp || 0) + (passenger.Parch || 0);
    if (familySize > 0 && familySize < 4) {
      score += 0.05; // Small families had better survival
    } else if (familySize >= 4) {
      score -= 0.1; // Large families had worse survival
    }
    
    // Fare (proxy for wealth)
    const fare = passenger.Fare || 15;
    if (fare > 50) {
      score += 0.1;
    } else if (fare < 10) {
      score -= 0.05;
    }
    
    // Clamp probability between 0 and 1
    const probability = Math.max(0, Math.min(1, score));
    
    return {
      probability,
      survived: probability > 0.5
    };
  };

  const handlePredict = () => {
    const result = predictSurvival({
      Sex: input.sex,
      Pclass: input.pclass,
      Age: input.age,
      SibSp: input.sibsp,
      Parch: input.parch,
      Fare: input.fare,
      Embarked: input.embarked
    });
    setPrediction(result);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <Ship className="w-12 h-12 text-blue-600 animate-pulse mx-auto mb-4" />
          <p className="text-lg text-gray-600">Loading Titanic data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <Ship className="w-12 h-12 text-blue-600 mr-3" />
            <h1 className="text-4xl font-bold text-gray-800">Titanic Survival Predictor</h1>
          </div>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Using machine learning to predict passenger survival on the RMS Titanic based on historical data
          </p>
        </div>

        {/* Model Statistics */}
        {modelStats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow-md p-6 text-center">
              <BarChart3 className="w-8 h-8 text-green-600 mx-auto mb-2" />
              <h3 className="text-lg font-semibold text-gray-800">Model Accuracy</h3>
              <p className="text-3xl font-bold text-green-600">{modelStats.accuracy.toFixed(1)}%</p>
            </div>
            <div className="bg-white rounded-lg shadow-md p-6 text-center">
              <Users className="w-8 h-8 text-blue-600 mx-auto mb-2" />
              <h3 className="text-lg font-semibold text-gray-800">Total Passengers</h3>
              <p className="text-3xl font-bold text-blue-600">{modelStats.totalPassengers}</p>
            </div>
            <div className="bg-white rounded-lg shadow-md p-6 text-center">
              <User className="w-8 h-8 text-green-600 mx-auto mb-2" />
              <h3 className="text-lg font-semibold text-gray-800">Survived</h3>
              <p className="text-3xl font-bold text-green-600">{modelStats.survivedCount}</p>
            </div>
            <div className="bg-white rounded-lg shadow-md p-6 text-center">
              <User className="w-8 h-8 text-red-600 mx-auto mb-2" />
              <h3 className="text-lg font-semibold text-gray-800">Perished</h3>
              <p className="text-3xl font-bold text-red-600">{modelStats.deathCount}</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Prediction Input */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center mb-6">
              <Brain className="w-6 h-6 text-purple-600 mr-2" />
              <h2 className="text-2xl font-bold text-gray-800">Make a Prediction</h2>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Passenger Class
                  </label>
                  <select
                    value={input.pclass}
                    onChange={(e) => setInput({...input, pclass: parseInt(e.target.value)})}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value={1}>1st Class</option>
                    <option value={2}>2nd Class</option>
                    <option value={3}>3rd Class</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Gender
                  </label>
                  <select
                    value={input.sex}
                    onChange={(e) => setInput({...input, sex: e.target.value})}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Age
                  </label>
                  <input
                    type="number"
                    value={input.age}
                    onChange={(e) => setInput({...input, age: parseInt(e.target.value)})}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    min="0"
                    max="100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fare ($)
                  </label>
                  <input
                    type="number"
                    value={input.fare}
                    onChange={(e) => setInput({...input, fare: parseFloat(e.target.value)})}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Siblings/Spouses
                  </label>
                  <input
                    type="number"
                    value={input.sibsp}
                    onChange={(e) => setInput({...input, sibsp: parseInt(e.target.value)})}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Parents/Children
                  </label>
                  <input
                    type="number"
                    value={input.parch}
                    onChange={(e) => setInput({...input, parch: parseInt(e.target.value)})}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    min="0"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Port of Embarkation
                </label>
                <select
                  value={input.embarked}
                  onChange={(e) => setInput({...input, embarked: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="S">Southampton</option>
                  <option value="C">Cherbourg</option>
                  <option value="Q">Queenstown</option>
                </select>
              </div>

              <button
                onClick={handlePredict}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 transition-colors font-medium"
              >
                Predict Survival
              </button>
            </div>
          </div>

          {/* Prediction Result */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center mb-6">
              <DollarSign className="w-6 h-6 text-green-600 mr-2" />
              <h2 className="text-2xl font-bold text-gray-800">Prediction Result</h2>
            </div>

            {prediction ? (
              <div className="text-center">
                <div className={`inline-flex items-center justify-center w-24 h-24 rounded-full mb-4 ${
                  prediction.survived ? 'bg-green-100' : 'bg-red-100'
                }`}>
                  <User className={`w-12 h-12 ${
                    prediction.survived ? 'text-green-600' : 'text-red-600'
                  }`} />
                </div>
                
                <h3 className={`text-3xl font-bold mb-2 ${
                  prediction.survived ? 'text-green-600' : 'text-red-600'
                }`}>
                  {prediction.survived ? 'SURVIVED' : 'DID NOT SURVIVE'}
                </h3>
                
                <p className="text-lg text-gray-600 mb-4">
                  Survival Probability: <span className="font-semibold">
                    {(prediction.probability * 100).toFixed(1)}%
                  </span>
                </p>

                <div className="w-full bg-gray-200 rounded-full h-4 mb-6">
                  <div
                    className={`h-4 rounded-full transition-all duration-500 ${
                      prediction.survived ? 'bg-green-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${prediction.probability * 100}%` }}
                  ></div>
                </div>

                <div className="text-sm text-gray-500 bg-gray-50 p-4 rounded-md">
                  <p className="font-medium mb-2">Key Factors:</p>
                  <ul className="text-left space-y-1">
                    <li>• Gender: {input.sex === 'female' ? 'Female (higher survival rate)' : 'Male (lower survival rate)'}</li>
                    <li>• Class: {input.pclass === 1 ? '1st Class (highest survival)' : input.pclass === 2 ? '2nd Class (moderate survival)' : '3rd Class (lowest survival)'}</li>
                    <li>• Age: {input.age < 16 ? 'Child (higher survival)' : input.age > 60 ? 'Elderly (lower survival)' : 'Adult'}</li>
                    <li>• Family: {(input.sibsp + input.parch) === 0 ? 'Traveling alone' : `Family of ${input.sibsp + input.parch + 1}`}</li>
                  </ul>
                </div>
              </div>
            ) : (
              <div className="text-center text-gray-500 py-12">
                <Ship className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg">Enter passenger details and click "Predict Survival" to see the result</p>
              </div>
            )}
          </div>
        </div>

        {/* Model Information */}
        <div className="mt-8 bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">About This Model</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-700 mb-2">How It Works</h3>
              <p className="text-gray-600 mb-4">
                This model uses a rule-based approach that considers the most important factors that influenced survival on the Titanic:
              </p>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• <strong>Gender:</strong> Women had a much higher survival rate (74% vs 19%)</li>
                <li>• <strong>Class:</strong> First-class passengers had better access to lifeboats</li>
                <li>• <strong>Age:</strong> Children were prioritized in evacuations</li>
                <li>• <strong>Family Size:</strong> Small families had better coordination</li>
                <li>• <strong>Fare:</strong> Higher fares often meant better cabin locations</li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-700 mb-2">Historical Context</h3>
              <p className="text-gray-600 text-sm">
                The RMS Titanic sank on April 15, 1912, after hitting an iceberg. Of the estimated 2,224 passengers and crew aboard, 
                more than 1,500 died. The "women and children first" protocol, passenger class, and proximity to lifeboats were 
                major factors in determining survival. This dataset helps us understand these patterns and build predictive models 
                for similar scenarios.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TitanicPredictor;