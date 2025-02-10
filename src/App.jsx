import React, { useState, useEffect } from 'react';
import NDK from '@nostr-dev-kit/ndk';
import { nip19 } from 'nostr-tools';

function App() {
  const [publicKey, setPublicKey] = useState('');
  const [zappedNotes, setZappedNotes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [ndk, setNdk] = useState(null);

  const relays = ['wss://relay.damus.io', 'wss://relay.snort.social', 'wss://nostr.wine'];

  useEffect(() => {
    const initializeNDK = async () => {
      setLoading(true); // Start loading immediately on component mount
      setError('');
      try {
        const newNdk = new NDK({ explicitRelayUrls: relays }); // Use explicitRelayUrls as per docs
        await newNdk.connect();
        setNdk(newNdk);
      } catch (initError) {
        console.error("Error initializing NDK:", initError);
        setError("Failed to initialize NDK. Check console for details.");
      } finally {
        setLoading(false); // Stop loading after initialization attempt (success or fail)
      }
    };

    initializeNDK();
  }, []);

  const fetchZappedNotes = async () => {
    if (!ndk) {
      setError("NDK not initialized. Please wait and try again.");
      return;
    }

    setLoading(true);
    setError('');
    setZappedNotes([]);

    let pubkeyHex;
    try {
      if (publicKey.startsWith('npub')) {
        const decoded = nip19.decode(publicKey);
        if (decoded.type !== 'npub') {
          setError('Invalid npub key.');
          setLoading(false);
          return;
        }
        pubkeyHex = decoded.data;
      } else if (publicKey.length === 64) {
        pubkeyHex = publicKey;
      } else {
        setError('Invalid public key format. Please use npub or hex.');
        setLoading(false);
        return;
      }
    } catch (err) {
      setError('Error decoding public key: ' + err.message);
      setLoading(false);
      return;
    }

    try {
      const filter = {
        kinds: [9735],
        '#p': [pubkeyHex],
      };

      const events = await ndk.fetchEvents(filter);
      if (events && events.size > 0) {
        setZappedNotes(Array.from(events.values()));
      } else {
        setZappedNotes([]); // Explicitly set to empty array when no events are found
        setError("No zapped notes found for this user on provided relays."); // Inform user if no zaps found
      }

    } catch (err) {
      setError('Failed to fetch data from relays: ' + err.message);
      console.error("Error fetching from relays:", err);
    } finally {
      setLoading(false);
    }
  };

  const handlePublicKeyChange = (event) => {
    setPublicKey(event.target.value);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    fetchZappedNotes();
  };

  return (
    <div className="container">
      <h1>Nostr Zapped Notes</h1>
      <form onSubmit={handleSubmit} className="input-form">
        <input
          type="text"
          placeholder="Enter npub or hex public key"
          value={publicKey}
          onChange={handlePublicKeyChange}
          className="key-input"
        />
        <button type="submit" disabled={loading} className="fetch-button">
          {loading ? 'Loading...' : 'Fetch Zapped Notes'}
        </button>
      </form>

      {error && <p className="error-message error-message">{error}</p>}

      {loading && !error && <p>Loading zapped notes...</p>}

      {!loading && !error && zappedNotes.length > 0 && (
        <div className="notes-container">
          <h2>Zapped Notes</h2>
          <ul>
            {zappedNotes.map((note) => (
              <li key={note.id} className="note-item">
                <p><b>Content:</b> {note.content}</p>
                <p><b>Created At:</b> {new Date(note.created_at * 1000).toLocaleString()}</p>
                <p><b>Event ID:</b> <code>{note.id}</code></p>
              </li>
            ))}
          </ul>
        </div>
      )}
      {!loading && !error && zappedNotes.length === 0 && publicKey && !error && <p>No zapped notes found for this user on provided relays.</p>}
    </div>
  );
}

export default App;
