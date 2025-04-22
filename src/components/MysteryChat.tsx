// src/components/MysteryChat.tsx (simplified)
import React, { useState } from 'react';
import { getAIResponse } from '../services/aiService';

const MysteryChat: React.FC = () => {
  const [theme, setTheme] = useState('');
  const [playerCount, setPlayerCount] = useState(6);
  const [mystery, setMystery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const response = await getAIResponse({
        theme,
        playerCount,
        isPaid: false // For free version
      });
      
      setMystery(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="mystery-chat">
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="theme">Theme:</label>
          <input 
            id="theme"
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
            placeholder="e.g., 1920s Speakeasy, Space Station"
            required
          />
        </div>
        
        <div>
          <label htmlFor="playerCount">Number of Players:</label>
          <input
            id="playerCount"
            type="number"
            min="3"
            max="15"
            value={playerCount}
            onChange={(e) => setPlayerCount(parseInt(e.target.value))}
            required
          />
        </div>
        
        <button type="submit" disabled={loading}>
          {loading ? 'Generating...' : 'Generate Mystery Preview'}
        </button>
      </form>
      
      {error && <div className="error">{error}</div>}
      
      {mystery && (
        <div className="mystery-preview">
          <div className="markdown-content">
            {/* Use a markdown renderer here */}
            <pre>{mystery}</pre>
          </div>
          <button className="upgrade-button">
            Upgrade to Full Package
          </button>
        </div>
      )}
    </div>
  );
};

export default MysteryChat;
