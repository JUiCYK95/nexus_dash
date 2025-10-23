'use client'

import { useState, useRef, useEffect } from 'react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { useSidebar } from '@/contexts/SidebarContext'
import { PaperAirplaneIcon, SparklesIcon, TrashIcon, ClipboardDocumentIcon, CheckIcon } from '@heroicons/react/24/outline'
import { toast } from 'react-hot-toast'
import { motion, AnimatePresence } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import SyntaxHighlighter from 'react-syntax-highlighter/dist/esm/light'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/hljs'
import javascript from 'react-syntax-highlighter/dist/esm/languages/hljs/javascript'
import typescript from 'react-syntax-highlighter/dist/esm/languages/hljs/typescript'
import python from 'react-syntax-highlighter/dist/esm/languages/hljs/python'
import java from 'react-syntax-highlighter/dist/esm/languages/hljs/java'
import css from 'react-syntax-highlighter/dist/esm/languages/hljs/css'
import sql from 'react-syntax-highlighter/dist/esm/languages/hljs/sql'
import json from 'react-syntax-highlighter/dist/esm/languages/hljs/json'
import xml from 'react-syntax-highlighter/dist/esm/languages/hljs/xml'
import bash from 'react-syntax-highlighter/dist/esm/languages/hljs/bash'

// Register languages
if (typeof SyntaxHighlighter.registerLanguage === 'function') {
  SyntaxHighlighter.registerLanguage('javascript', javascript)
  SyntaxHighlighter.registerLanguage('typescript', typescript)
  SyntaxHighlighter.registerLanguage('python', python)
  SyntaxHighlighter.registerLanguage('java', java)
  SyntaxHighlighter.registerLanguage('css', css)
  SyntaxHighlighter.registerLanguage('sql', sql)
  SyntaxHighlighter.registerLanguage('json', json)
  SyntaxHighlighter.registerLanguage('xml', xml)
  SyntaxHighlighter.registerLanguage('html', xml)
  SyntaxHighlighter.registerLanguage('bash', bash)
}

interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

// Code Block Component with Copy functionality
const CodeBlock = ({ language, value }: { language: string; value: string }) => {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="relative group my-4">
      <div className="flex items-center justify-between bg-gray-800 dark:bg-gray-900 px-4 py-2 rounded-t-lg border-b border-gray-700">
        <span className="text-xs font-mono text-gray-400 uppercase">{language || 'code'}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2 py-1 text-xs text-gray-400 hover:text-white transition-colors rounded hover:bg-gray-700"
        >
          {copied ? (
            <>
              <CheckIcon className="h-4 w-4" />
              <span>Kopiert!</span>
            </>
          ) : (
            <>
              <ClipboardDocumentIcon className="h-4 w-4" />
              <span>Kopieren</span>
            </>
          )}
        </button>
      </div>
      <SyntaxHighlighter
        language={language || 'text'}
        style={vscDarkPlus}
        customStyle={{
          margin: 0,
          borderTopLeftRadius: 0,
          borderTopRightRadius: 0,
          borderBottomLeftRadius: '0.5rem',
          borderBottomRightRadius: '0.5rem',
        }}
        showLineNumbers
      >
        {value}
      </SyntaxHighlighter>
    </div>
  )
}

export default function NexusAIPage() {
  const { sidebarCollapsed } = useSidebar()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingHistory, setLoadingHistory] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Load chat history on mount
  useEffect(() => {
    const loadHistory = async () => {
      try {
        const response = await fetch('/api/nexus-ai/history')
        const data = await response.json()

        if (response.ok && data.messages) {
          // Convert timestamp strings back to Date objects
          const messagesWithDates = data.messages.map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp),
          }))
          setMessages(messagesWithDates)
        }
      } catch (error) {
        console.error('Error loading chat history:', error)
      } finally {
        setLoadingHistory(false)
      }
    }

    loadHistory()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!input.trim() || loading) return

    const userMessage: Message = {
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setLoading(true)

    try {
      const response = await fetch('/api/nexus-ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            ...messages.map(m => ({
              role: m.role,
              content: m.content,
            })),
            {
              role: 'user',
              content: userMessage.content,
            },
          ],
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Fehler bei der Kommunikation mit Nexus AI')
      }

      const aiMessage: Message = {
        role: 'assistant',
        content: data.message,
        timestamp: new Date(),
      }

      setMessages(prev => [...prev, aiMessage])
    } catch (error: any) {
      console.error('Error sending message:', error)
      toast.error(error.message || 'Fehler beim Senden der Nachricht')
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  const handleClearChat = async () => {
    try {
      const response = await fetch('/api/nexus-ai/history', {
        method: 'DELETE',
      })

      if (response.ok) {
        setMessages([])
        toast.success('Chat wurde geleert')
      } else {
        toast.error('Fehler beim Leeren des Chats')
      }
    } catch (error) {
      console.error('Error clearing chat:', error)
      toast.error('Fehler beim Leeren des Chats')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  return (
    <DashboardLayout hideHeader={true}>
      <div
        className={`fixed inset-0 flex flex-col bg-gray-50 dark:bg-gray-900 transition-all duration-300 ${
          sidebarCollapsed ? 'md:left-20' : 'md:left-64 lg:left-72 xl:left-80'
        }`}
      >
        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between px-4 sm:px-6 lg:px-8 py-5 border-b border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl shadow-sm">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500 to-blue-600 rounded-2xl blur-sm opacity-75"></div>
              <div className="relative p-3 bg-gradient-to-br from-purple-500 to-blue-600 rounded-2xl">
                <SparklesIcon className="h-6 w-6 text-white" />
              </div>
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                Nexus AI
              </h1>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 font-medium">
                Powered by Nexus Automotive
              </p>
            </div>
          </div>

          {messages.length > 0 && (
            <button
              onClick={handleClearChat}
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all hover:scale-105 active:scale-95"
            >
              <TrashIcon className="h-4 w-4" />
              <span className="hidden sm:inline">Chat leeren</span>
            </button>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6">
          {loadingHistory ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center space-y-4">
                <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                <p className="text-gray-600 dark:text-gray-400">Lade Chat-Verlauf...</p>
              </div>
            </div>
          ) : messages.length === 0 ? (
            <div className="h-full flex items-center justify-center px-4">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="text-center space-y-8 max-w-2xl"
              >
                <div className="relative inline-block">
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-500 to-blue-600 rounded-3xl blur-2xl opacity-30 animate-pulse"></div>
                  <div className="relative mx-auto w-20 h-20 bg-gradient-to-br from-purple-500 to-blue-600 rounded-3xl flex items-center justify-center shadow-2xl">
                    <SparklesIcon className="h-10 w-10 text-white" />
                  </div>
                </div>
                <div className="space-y-3">
                  <h2 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                    Willkommen bei Nexus AI
                  </h2>
                  <p className="text-base sm:text-lg text-gray-600 dark:text-gray-400 max-w-md mx-auto leading-relaxed">
                    Ihr intelligenter Assistent für WhatsApp Business Automatisierung und Kundenkommunikation
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setInput('Was kannst du für mich tun?')}
                    className="group p-4 text-left bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-750 border-2 border-gray-200 dark:border-gray-700 hover:border-purple-500 dark:hover:border-purple-500 rounded-xl transition-all shadow-sm hover:shadow-md"
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 p-2 bg-gradient-to-br from-purple-500 to-blue-600 rounded-lg group-hover:scale-110 transition-transform">
                        <SparklesIcon className="h-4 w-4 text-white" />
                      </div>
                      <span className="text-gray-700 dark:text-gray-300 font-medium">Was kannst du für mich tun?</span>
                    </div>
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setInput('Erkläre mir WhatsApp Business API')}
                    className="group p-4 text-left bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-750 border-2 border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-500 rounded-xl transition-all shadow-sm hover:shadow-md"
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 p-2 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-lg group-hover:scale-110 transition-transform">
                        <SparklesIcon className="h-4 w-4 text-white" />
                      </div>
                      <span className="text-gray-700 dark:text-gray-300 font-medium">Erkläre mir WhatsApp Business API</span>
                    </div>
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setInput('Wie kann ich Kampagnen erstellen?')}
                    className="group p-4 text-left bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-750 border-2 border-gray-200 dark:border-gray-700 hover:border-green-500 dark:hover:border-green-500 rounded-xl transition-all shadow-sm hover:shadow-md"
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 p-2 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg group-hover:scale-110 transition-transform">
                        <SparklesIcon className="h-4 w-4 text-white" />
                      </div>
                      <span className="text-gray-700 dark:text-gray-300 font-medium">Wie kann ich Kampagnen erstellen?</span>
                    </div>
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setInput('Tipps für bessere Kundenkommunikation')}
                    className="group p-4 text-left bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-750 border-2 border-gray-200 dark:border-gray-700 hover:border-orange-500 dark:hover:border-orange-500 rounded-xl transition-all shadow-sm hover:shadow-md"
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 p-2 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg group-hover:scale-110 transition-transform">
                        <SparklesIcon className="h-4 w-4 text-white" />
                      </div>
                      <span className="text-gray-700 dark:text-gray-300 font-medium">Tipps für bessere Kundenkommunikation</span>
                    </div>
                  </motion.button>
                </div>
              </motion.div>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto space-y-6">
              <AnimatePresence>
                {messages.map((message, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-5 py-4 shadow-lg ${
                        message.role === 'user'
                          ? 'bg-gradient-to-br from-purple-500 to-blue-600 text-white shadow-purple-500/20'
                          : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-2 border-gray-200 dark:border-gray-700 shadow-gray-200 dark:shadow-gray-900/50'
                      }`}
                    >
                    {message.role === 'user' ? (
                      <p className="whitespace-pre-wrap break-words leading-relaxed">{message.content}</p>
                    ) : (
                      <div className="prose prose-sm max-w-none dark:prose-invert
                        prose-headings:font-bold prose-headings:text-gray-900 dark:prose-headings:text-white
                        prose-h1:text-2xl prose-h1:mb-4 prose-h1:mt-6
                        prose-h2:text-xl prose-h2:mb-3 prose-h2:mt-5
                        prose-h3:text-lg prose-h3:mb-2 prose-h3:mt-4
                        prose-p:my-3 prose-p:leading-relaxed prose-p:text-gray-700 dark:prose-p:text-gray-300
                        prose-a:text-blue-600 dark:prose-a:text-blue-400 prose-a:no-underline hover:prose-a:underline
                        prose-strong:text-gray-900 dark:prose-strong:text-white prose-strong:font-semibold
                        prose-code:text-pink-600 dark:prose-code:text-pink-400 prose-code:bg-gray-100 dark:prose-code:bg-gray-800 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:font-mono prose-code:before:content-none prose-code:after:content-none
                        prose-pre:bg-gray-900 prose-pre:text-gray-100
                        prose-ul:my-3 prose-ul:list-disc prose-ul:pl-6
                        prose-ol:my-3 prose-ol:list-decimal prose-ol:pl-6
                        prose-li:my-1.5 prose-li:text-gray-700 dark:prose-li:text-gray-300
                        prose-blockquote:border-l-4 prose-blockquote:border-blue-500 prose-blockquote:pl-4 prose-blockquote:italic prose-blockquote:text-gray-700 dark:prose-blockquote:text-gray-400
                        prose-hr:my-6 prose-hr:border-gray-300 dark:prose-hr:border-gray-700
                        prose-table:w-full prose-table:border-collapse
                        prose-th:border prose-th:border-gray-300 dark:prose-th:border-gray-700 prose-th:bg-gray-100 dark:prose-th:bg-gray-800 prose-th:px-4 prose-th:py-2 prose-th:text-left prose-th:font-semibold
                        prose-td:border prose-td:border-gray-300 dark:prose-td:border-gray-700 prose-td:px-4 prose-td:py-2
                        prose-img:rounded-lg prose-img:shadow-md
                      ">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={{
                            code({ node, inline, className, children, ...props }) {
                              const match = /language-(\w+)/.exec(className || '')
                              const value = String(children).replace(/\n$/, '')

                              return !inline && match ? (
                                <CodeBlock language={match[1]} value={value} />
                              ) : (
                                <code className={className} {...props}>
                                  {children}
                                </code>
                              )
                            },
                            h1: ({ node, ...props }) => <h1 className="scroll-mt-20" {...props} />,
                            h2: ({ node, ...props }) => <h2 className="scroll-mt-20" {...props} />,
                            h3: ({ node, ...props }) => <h3 className="scroll-mt-20" {...props} />,
                            a: ({ node, ...props }) => (
                              <a target="_blank" rel="noopener noreferrer" {...props} />
                            ),
                          }}
                        >
                          {message.content}
                        </ReactMarkdown>
                      </div>
                    )}
                    <p
                      className={`text-xs mt-1 ${
                        message.role === 'user'
                          ? 'text-purple-100'
                          : 'text-gray-500 dark:text-gray-400'
                      }`}
                    >
                      {message.timestamp.toLocaleTimeString('de-DE', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            </div>
          )}

          {loading && (
            <div className="max-w-4xl mx-auto">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex justify-start"
              >
                <div className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-2xl px-6 py-4 shadow-lg">
                  <div className="flex items-center gap-3">
                    <div className="flex gap-1.5">
                      <div className="w-2.5 h-2.5 bg-gradient-to-br from-purple-500 to-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                      <div className="w-2.5 h-2.5 bg-gradient-to-br from-purple-500 to-blue-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                      <div className="w-2.5 h-2.5 bg-gradient-to-br from-purple-500 to-blue-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                    <span className="text-sm text-gray-500 dark:text-gray-400">Nexus AI denkt nach...</span>
                  </div>
                </div>
              </motion.div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="flex-shrink-0 px-4 sm:px-6 lg:px-8 py-4 sm:py-6 border-t border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl shadow-2xl">
          <div className="max-w-4xl mx-auto space-y-3">
            <form onSubmit={handleSubmit} className="flex gap-3 items-start">
              <div className="flex-1 relative">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Schreiben Sie Ihre Nachricht..."
                  className="w-full resize-none px-5 py-4 bg-gray-50 dark:bg-gray-900/50 border-2 border-gray-200 dark:border-gray-700 rounded-2xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 max-h-32 transition-all shadow-sm focus:shadow-md"
                  rows={1}
                  disabled={loading}
                />
                {input.length > 0 && (
                  <div className="absolute bottom-2 right-2 text-xs text-gray-400">
                    {input.length} Zeichen
                  </div>
                )}
              </div>
              <button
                type="submit"
                disabled={!input.trim() || loading}
                className="flex-shrink-0 h-[3.75rem] px-6 bg-gradient-to-br from-purple-500 to-blue-600 text-white rounded-2xl hover:shadow-xl hover:shadow-purple-500/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:shadow-none flex items-center justify-center"
              >
                <PaperAirplaneIcon className="h-5 w-5" />
              </button>
            </form>
            <div className="flex items-center justify-center gap-2 text-xs text-gray-500 dark:text-gray-400">
              <SparklesIcon className="h-3.5 w-3.5" />
              <p>
                Nexus AI kann Fehler machen. Überprüfen Sie wichtige Informationen.
              </p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
