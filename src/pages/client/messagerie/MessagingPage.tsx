import { useEffect, useState } from 'react';
import { Link } from '@tanstack/react-router';
import clsx from 'clsx';
import ClientNavbar from '../../../components/layout/client/ClientNavbar';
import ClientBottomNav from '../../../components/layout/client/ClientBottomNav';
import MIcon from '../../../components/shared/MIcon';
import { useLanguage } from '../../../context/LanguageContext';
import { useAuthGuard } from '../../../hooks/useAuthGuard';
import { chatApi, type ConversationItem, type MessageItem } from '../../../services/api';

interface UIConversation {
  id: number;
  riderName: string;
  orderCode: string;
  lastMessage: string;
  time: string;
}

interface UIMessage {
  id: string | number;
  text: string;
  sender: 'client' | 'rider';
  time: string;
}

const INITIAL_MESSAGES: UIMessage[] = [
  {
    id: 'm1',
    text: 'Bonjour ! Je prends votre commande en charge.',
    sender: 'rider',
    time: '14:10',
  },
  {
    id: 'm2',
    text: 'Merci ! Je suis au carrefour Cadjehoun.',
    sender: 'client',
    time: '14:12',
  },
  {
    id: 'm3',
    text: 'Je serai là dans environ 15 minutes.',
    sender: 'rider',
    time: '14:15',
  },
  {
    id: 'm4',
    text: "D'accord, je vous attends.",
    sender: 'client',
    time: '14:16',
  },
  {
    id: 'm5',
    text: "J'arrive dans 10 min 🛵",
    sender: 'rider',
    time: '14:38',
  },
];

/**
 * MessagingPage — Tchat Client connecté au Backend Laravel
 */
export default function MessagingPage() {
  const { isFr } = useLanguage();
  const { isAuthenticated, isLoading } = useAuthGuard('/connexion');

  const [conversations, setConversations] = useState<UIConversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<number | null>(null);
  const [messages, setMessages] = useState<UIMessage[]>(INITIAL_MESSAGES);
  const [inputText, setInputText] = useState('');

  // 1. Fetch Conversations from Laravel Backend GET /api/conversations
  useEffect(() => {
    if (!isAuthenticated) return;

    chatApi.getConversations()
      .then((res) => {
        const list = res?.data || (Array.isArray(res) ? res : []);
        if (Array.isArray(list) && list.length > 0) {
          const mapped: UIConversation[] = list.map((c: ConversationItem) => ({
            id: c.id,
            riderName: 'Livreur TOKPa',
            orderCode: c.order_id ? `#TOK-${c.order_id}` : '#TOK-2847',
            lastMessage: 'Discussion en cours...',
            time: c.updated_at ? new Date(c.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '14:38',
          }));
          setConversations(mapped);
          if (!activeConvId) {
            setActiveConvId(mapped[0].id);
          }
        }
      })
      .catch((err) => {
        console.warn('Backend conversations fallback:', err);
      });
  }, [isAuthenticated]);

  // 2. Fetch Messages for active conversation GET /api/conversations/{id}/messages
  useEffect(() => {
    if (!isAuthenticated || !activeConvId) return;

    chatApi.getMessages(activeConvId)
      .then((res) => {
        const msgs = res?.data?.data || res?.data || (Array.isArray(res) ? res : []);
        if (Array.isArray(msgs) && msgs.length > 0) {
          const userStr = localStorage.getItem('tokpa_user');
          const currentUserId = userStr ? JSON.parse(userStr)?.id : null;

          const mapped: UIMessage[] = msgs.map((m: MessageItem) => ({
            id: m.id,
            text: m.contenu,
            sender: m.sender_id === currentUserId ? 'client' : 'rider',
            time: m.created_at ? new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '14:38',
          }));
          setMessages(mapped);
        }
      })
      .catch((err) => {
        console.warn('Backend messages fallback:', err);
      });
  }, [isAuthenticated, activeConvId]);

  if (isLoading || !isAuthenticated) {
    return (
      <div className="bg-bg-app min-h-screen flex items-center justify-center font-body text-text-main">
        <MIcon name="sync" className="text-primary text-4xl animate-spin" />
      </div>
    );
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const currentText = inputText;
    setInputText('');

    const optimisticMsg: UIMessage = {
      id: `msg_${Date.now()}`,
      text: currentText,
      sender: 'client',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, optimisticMsg]);

    // Send to Backend API if active conversation exists
    if (activeConvId) {
      try {
        await chatApi.sendMessage(activeConvId, currentText);
      } catch (err) {
        console.warn('Failed to send message to API:', err);
      }
    }
  };

  return (
    <div className="bg-bg-app font-body text-text-main h-screen overflow-hidden flex flex-col">
      {/* TopNavBar */}
      <ClientNavbar />

      {/* Main Layout */}
      <main className="mt-[52px] flex flex-1 h-[calc(100vh-52px)]">
        {/* Sidebar - Conversations List */}
        <aside className="hidden lg:flex flex-col w-[320px] bg-bg-card border-r border-border-default h-full">
          {/* Header */}
          <div className="p-md flex justify-between items-center">
            <h2 className="font-h2 text-h2 text-text-main font-bold">{isFr ? 'Messages' : 'Messages'}</h2>
            <button
              type="button"
              className="text-primary-container hover:bg-primary-tint p-sm rounded-lg transition-all active:scale-[0.97] cursor-pointer"
            >
              <MIcon name="edit_square" />
            </button>
          </div>

          {/* Search */}
          <div className="px-md pb-md">
            <div className="relative flex items-center bg-bg-app rounded-lg px-sm border border-border-default">
              <MIcon name="search" className="text-text-tertiary" />
              <input
                type="text"
                placeholder={isFr ? 'Rechercher...' : 'Search...'}
                className="bg-transparent border-none focus:ring-0 text-secondary w-full py-sm text-xs outline-none"
              />
            </div>
          </div>

          {/* Conversation Items */}
          <div className="flex-1 overflow-y-auto">
            {conversations.length === 0 ? (
              <div
                onClick={() => setActiveConvId(1)}
                className="bg-primary-tint border-l-[3px] border-primary-container p-md flex gap-md cursor-pointer transition-all"
              >
                <div className="relative">
                  <div className="w-12 h-12 rounded-full bg-success-dark flex items-center justify-center text-white font-bold text-h3">
                    JK
                  </div>
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-success border-2 border-white rounded-full" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center mb-xs">
                    <h3 className="font-h3 text-h3 text-text-main truncate font-bold">Jean Kouassi</h3>
                    <span className="font-micro text-micro text-text-tertiary">14:38</span>
                  </div>
                  <p className="font-secondary text-secondary text-primary-dark truncate mb-sm font-medium">
                    J'arrive dans 10 min 🛵
                  </p>
                  <span className="px-sm py-[2px] bg-primary-container text-white text-micro font-bold rounded-full inline-block">
                    En course
                  </span>
                </div>
              </div>
            ) : (
              conversations.map((c) => (
                <div
                  key={c.id}
                  onClick={() => setActiveConvId(c.id)}
                  className={clsx('p-md flex gap-md cursor-pointer transition-all border-b border-border-default/50', {
                    'bg-primary-tint border-l-[3px] border-primary-container': activeConvId === c.id,
                    'hover:bg-bg-secondary': activeConvId !== c.id,
                  })}
                >
                  <div className="relative shrink-0">
                    <div className="w-12 h-12 rounded-full bg-success-dark flex items-center justify-center text-white font-bold text-h3">
                      {c.riderName.substring(0, 2).toUpperCase()}
                    </div>
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-success border-2 border-white rounded-full" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-xs">
                      <h3 className="font-h3 text-h3 text-text-main truncate font-bold">{c.riderName}</h3>
                      <span className="font-micro text-micro text-text-tertiary">{c.time}</span>
                    </div>
                    <p className="font-secondary text-secondary text-primary-dark truncate mb-sm font-medium">
                      {c.lastMessage}
                    </p>
                    <span className="px-sm py-[2px] bg-primary-container text-white text-micro font-bold rounded-full inline-block">
                      {c.orderCode}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </aside>

        {/* Main Chat Area */}
        <section className="flex-1 flex flex-col h-full relative bg-bg-app">
          {/* Chat Header */}
          <header className="bg-bg-card h-[64px] px-lg flex items-center justify-between border-b border-border-default z-10">
            <div className="flex items-center gap-md">
              <div className="w-10 h-10 rounded-full bg-success-dark flex items-center justify-center text-white font-bold">
                JK
              </div>
              <div>
                <h2 className="font-h3 text-h3 text-text-main leading-none font-bold">Jean Kouassi</h2>
                <div className="flex items-center gap-xs mt-1">
                  <span className="w-2 h-2 bg-success rounded-full inline-block" />
                  <span className="text-secondary text-success font-label text-xs font-semibold">
                    En ligne · Livreur Zone Cadjehoun
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-sm">
              <a
                href="tel:+22990000000"
                className="p-sm text-text-secondary hover:bg-primary-tint hover:text-primary-container rounded-lg transition-all"
              >
                <MIcon name="call" />
              </a>
              <Link
                to="/commandes/suivi"
                className="p-sm text-text-secondary hover:bg-primary-tint hover:text-primary-container rounded-lg transition-all"
              >
                <MIcon name="map" />
              </Link>
            </div>
          </header>

          {/* Order Context Banner */}
          <div className="m-md px-md py-sm bg-primary-tint border border-primary-light rounded-lg flex justify-between items-center">
            <div className="flex items-center gap-sm">
              <MIcon name="shopping_bag" className="text-primary-container" />
              <span className="font-label text-label text-text-main">
                Commande <strong className="text-primary-container">#TOK-2847</strong> · 3 980 FCFA · En livraison
              </span>
            </div>
            <Link to="/commandes/suivi" className="text-primary-container font-bold text-label hover:underline">
              {isFr ? 'Suivre' : 'Track'}
            </Link>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto px-lg pb-xl flex flex-col gap-md">
            {/* Date Separator */}
            <div className="flex justify-center my-md">
              <span className="px-md py-1 bg-border-default rounded-full text-text-secondary text-micro font-bold">
                AUJOURD'HUI
              </span>
            </div>

            {/* Render Messages */}
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={clsx('flex flex-col gap-xs max-w-[70%]', {
                  'items-start self-start': msg.sender === 'rider',
                  'items-end self-end': msg.sender === 'client',
                })}
              >
                <div
                  className={clsx('p-md shadow-sm text-body rounded-xl', {
                    'bg-white bubble-received text-text-main border border-border-default/50':
                      msg.sender === 'rider',
                    'bg-primary-container bubble-sent text-white shadow-md': msg.sender === 'client',
                  })}
                >
                  {msg.text}
                </div>
                <span className="text-micro text-text-tertiary px-1">{msg.time}</span>
              </div>
            ))}
          </div>

          {/* Input Area */}
          <footer className="bg-bg-card border-t border-border-default p-md md:px-lg flex items-center gap-md">
            <button type="button" className="text-text-tertiary hover:text-text-secondary transition-colors cursor-pointer">
              <MIcon name="attach_file" />
            </button>
            <form onSubmit={handleSendMessage} className="flex-1 bg-bg-app rounded-full px-md flex items-center">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={isFr ? 'Écrire un message...' : 'Type a message...'}
                className="bg-transparent border-none focus:ring-0 text-body py-[10px] w-full text-sm outline-none"
              />
              <button
                type="button"
                className="text-text-tertiary hover:text-primary-container transition-colors ml-sm cursor-pointer"
              >
                <MIcon name="mood" />
              </button>
            </form>
            <button
              type="button"
              onClick={handleSendMessage}
              className="w-10 h-10 bg-primary-container text-white rounded-full flex items-center justify-center shadow-lg hover:bg-primary-hover active:scale-95 transition-all cursor-pointer"
            >
              <MIcon name="send" style={{ fontVariationSettings: "'FILL' 1" }} />
            </button>
          </footer>
        </section>
      </main>

      {/* BottomNavBar */}
      <ClientBottomNav />
    </div>
  );
}
