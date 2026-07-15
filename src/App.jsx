import { useState } from 'react';
import Start from './pages/Start';
import RoomList from './pages/RoomList';
import CharacterSelect from './pages/CharacterSelect';
import WaitingRoom from './pages/WaitingRoom';
import GameBoard from './pages/GameBoard';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import './index.css';

function App() {
  const [currentScreen, setCurrentScreen] = useState('start');
  const [sessionData, setSessionData] = useState({
    code: '',
    nickname: '',
    roomId: null,
    character: null
  });

  const [adminSessions, setAdminSessions] = useState([]); // { code, rooms: [{id, players}], status: 'waiting' | 'playing', startedAt: null }

  const handleEnterRoom = (code, nickname) => {
    setSessionData({ ...sessionData, code, nickname });
    setCurrentScreen('roomList');
  };

  const handleSelectRoom = (roomId) => {
    setSessionData({ ...sessionData, roomId });
    setCurrentScreen('characterSelect');
  };

  const handleSelectCharacter = (character, playerId) => {
    setSessionData({ ...sessionData, character, playerId });
    setCurrentScreen('waitingRoom');
  };

  const handleStartGame = () => {
    setCurrentScreen('gameBoard');
  };

  const handleEnterAdminLogin = () => {
    setCurrentScreen('adminLogin');
  };

  const handleAdminLoginSuccess = () => {
    setCurrentScreen('adminDashboard');
  };

  const handleBackToStart = () => {
    setCurrentScreen('start');
  };

  const handleBackToRoomList = () => {
    setCurrentScreen('roomList');
  };

  const handleBackToCharacterSelect = () => {
    setCurrentScreen('characterSelect');
  };

  const handleBackToWaitingRoom = () => {
    setCurrentScreen('waitingRoom');
  };

  return (
    <>
      {currentScreen === 'start' && <Start onEnter={handleEnterRoom} onAdmin={handleEnterAdminLogin} />}
      {currentScreen === 'adminLogin' && (
        <AdminLogin 
          onLogin={handleAdminLoginSuccess}
          onBack={handleBackToStart}
        />
      )}
      {currentScreen === 'adminDashboard' && (
        <AdminDashboard 
          sessions={adminSessions}
          setSessions={setAdminSessions}
          onBack={handleBackToStart}
        />
      )}
      {currentScreen === 'roomList' && (
        <RoomList 
          sessionData={sessionData}
          onSelectRoom={handleSelectRoom} 
          onBack={handleBackToStart} 
        />
      )}
      {currentScreen === 'characterSelect' && (
        <CharacterSelect 
          sessionData={sessionData}
          onSelectCharacter={handleSelectCharacter}
          onBack={handleBackToRoomList}
        />
      )}
      {currentScreen === 'waitingRoom' && (
        <WaitingRoom 
          sessionData={sessionData}
          onStartGame={handleStartGame}
          onBack={handleBackToCharacterSelect}
        />
      )}
      {currentScreen === 'gameBoard' && (
        <GameBoard 
          sessionData={sessionData}
          onBack={handleBackToWaitingRoom}
          onHome={handleBackToStart}
        />
      )}
    </>
  );
}

export default App;
