import { useState, useRef, useEffect } from 'react';
import { sendScopeChat, ingestScope } from '../../services/scopePilotService.js';
import { Card, Button, LoadingState, Notice } from '../../components/ui.jsx';
import styles from './ScopeChatTab.module.css';

const DEFAULT_SUGGESTIONS = [
  'What are the approved deliverables in this project?',
  'Is mobile app responsive design included in scope?',
  'What are the milestones and delivery deadlines?',
  'Are third-party payment integrations covered?',
];

export default function ScopeChatTab({ projectId, approvedProposalVersion = 1 }) {
  const [messages, setMessages] = useState([
    {
      id: 'welcome-1',
      sender: 'assistant',
      text: `Hello! I am ScopePilot AI. I am grounded directly in the approved scope baseline (Proposal v${approvedProposalVersion}). Ask me any question about agreed deliverables, exclusions, or timeline commitments.`,
      sources: [],
      hasSufficientEvidence: true,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [inputQuestion, setInputQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [indexing, setIndexing] = useState(false);
  const [indexNotice, setIndexNotice] = useState(null);

  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  async function handleSend(questionText) {
    const q = (questionText || inputQuestion).trim();
    if (!q || loading) return;

    setInputQuestion('');
    setError(null);

    const userMsg = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: q,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const response = await sendScopeChat({
        projectId: projectId.toString(),
        question: q,
        topK: 3,
      });

      const aiMsg = {
        id: `ai-${Date.now()}`,
        sender: 'assistant',
        text: response.answer,
        sources: response.sources || [],
        proposalVersion: response.proposalVersion,
        hasSufficientEvidence: response.hasSufficientEvidence !== false,
        insufficientEvidenceNotice: response.insufficientEvidenceNotice,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      setError(err.message || 'Scope Chat request failed.');
    } finally {
      setLoading(false);
    }
  }

  async function handleIngest() {
    setIndexing(true);
    setIndexNotice(null);
    try {
      const result = await ingestScope({ projectId: projectId.toString() });
      setIndexNotice(`Successfully indexed ${result.chunksCreated || 0} scope chunks into Vector Store.`);
    } catch (err) {
      setIndexNotice(`Indexing notification: ${err.message || 'Completed'}`);
    } finally {
      setIndexing(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className={styles.container}>
      {indexNotice && (
        <div className={styles.indexingBanner}>
          <span>✓ {indexNotice}</span>
          <Button size="sm" variant="secondary" onClick={() => setIndexNotice(null)}>
            Dismiss
          </Button>
        </div>
      )}

      <Card className={styles.chatCard}>
        {/* Header */}
        <div className={styles.chatHeader}>
          <div className={styles.titleArea}>
            <span className={styles.chatIcon}>💬</span>
            <div>
              <h3 className={styles.chatTitle}>Grounded Scope Chat</h3>
              <p className={styles.chatSubtitle}>
                Semantic Q&A grounded exclusively in approved proposal v{approvedProposalVersion}
              </p>
            </div>
          </div>
          <div className={styles.headerActions}>
            <Button
              variant="secondary"
              size="sm"
              loading={indexing}
              onClick={handleIngest}
              title="Chunk and vectorize approved proposal & deliverables"
            >
              🔄 Re-index Scope
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                setMessages([
                  {
                    id: 'reset',
                    sender: 'assistant',
                    text: `Conversation cleared. Ask any question about Proposal v${approvedProposalVersion}.`,
                    sources: [],
                    hasSufficientEvidence: true,
                    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                  },
                ])
              }
            >
              Clear
            </Button>
          </div>
        </div>

        {/* Suggested question chips */}
        <div className={styles.suggestedQueries}>
          {DEFAULT_SUGGESTIONS.map((suggestion, idx) => (
            <button
              key={idx}
              type="button"
              className={styles.queryChip}
              onClick={() => handleSend(suggestion)}
              disabled={loading}
            >
              {suggestion}
            </button>
          ))}
        </div>

        {/* Message Stream */}
        <div className={styles.messageArea}>
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`${styles.messageRow} ${msg.sender === 'user' ? styles.userRow : styles.assistantRow}`}
            >
              {msg.sender === 'user' ? (
                <div className={styles.userBubble}>
                  {msg.text}
                </div>
              ) : (
                <div className={styles.assistantBubble}>
                  <div className={styles.assistantMeta}>
                    <span className={styles.assistantName}>
                      🤖 ScopePilot Agent {msg.proposalVersion ? `(v${msg.proposalVersion})` : ''}
                    </span>
                    <span>{msg.timestamp}</span>
                  </div>

                  <p className={styles.answerText}>{msg.text}</p>

                  {!msg.hasSufficientEvidence && (
                    <div className={styles.insufficientNotice}>
                      <span>⚠️</span>
                      <span>
                        {msg.insufficientEvidenceNotice ||
                          'Insufficient scope evidence found. Human review is recommended.'}
                      </span>
                    </div>
                  )}

                  {msg.sources && msg.sources.length > 0 && (
                    <div className={styles.sourcesSection}>
                      <div className={styles.sourcesHeader}>Scope Citations & Evidence</div>
                      <div className={styles.sourceGrid}>
                        {msg.sources.map((src, sIdx) => (
                          <div key={sIdx} className={styles.sourceCard}>
                            <div className={styles.sourceTop}>
                              <span className={styles.sourceRef}>{src.sourceReference}</span>
                              <span className={styles.similarityScore}>
                                Match {Math.round((src.similarityScore || 0) * 100)}%
                              </span>
                            </div>
                            <div className={styles.sourceTitle}>{src.sourceTitle}</div>
                            <p className={styles.sourcePassage}>"{src.passageText}"</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className={`${styles.messageRow} ${styles.assistantRow}`}>
              <div className={styles.assistantBubble}>
                <LoadingState message="Retrieving approved scope evidence & generating answer…" />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {error && (
          <Notice variant="warning" style={{ marginBottom: 12 }}>
            {error}
          </Notice>
        )}

        {/* Input bar */}
        <div className={styles.inputArea}>
          <input
            type="text"
            className={styles.textInput}
            placeholder="Ask a question about approved scope (e.g., 'Are refunds supported?')..."
            value={inputQuestion}
            onChange={(e) => setInputQuestion(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading}
          />
          <Button
            variant="primary"
            onClick={() => handleSend()}
            disabled={!inputQuestion.trim() || loading}
            loading={loading}
          >
            Ask
          </Button>
        </div>
      </Card>
    </div>
  );
}
