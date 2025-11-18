'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { useDebounce } from '../hooks/useDebounce'
import { schemas, Schema } from '../data/schemas'
import SchemaDisplay from './SchemaDisplay'

interface QueryOption {
  prompt: string
  sqlQuery: string
}

interface AutocompleteResponse {
  queryOptions: QueryOption[]
  metadata: {
    latency_ms: number
    model: string
  }
}

interface Message {
  role: string
  content: string
}

const formatSql = (sql: string): string => {
  // A simple formatter to add newlines before major SQL keywords for readability
  return sql.replace(/\b(FROM|WHERE|GROUP BY|ORDER BY|LIMIT|JOIN|ON|LEFT JOIN|RIGHT JOIN|INNER JOIN|HAVING)\b/g, '\n$1');
};

export default function Autocomplete() {
  const [input, setInput] = useState('')
  const [suggestions, setSuggestions] = useState<QueryOption[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [latency, setLatency] = useState<number | null>(null)
  const [timeToFirstSuggestion, setTimeToFirstSuggestion] = useState<number | null>(null)
  const [selectedSchema, setSelectedSchema] = useState<Schema>(schemas[0])
  const [conversationHistory, setConversationHistory] = useState<Message[]>([])
  const debouncedInput = useDebounce(input, 500) // 500ms debounce delay

  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  // Fetch suggestions from backend
  const fetchSuggestions = useCallback(async (userInput: string) => {
    if (!userInput.trim()) return

    console.log(`Fetching suggestions for: "${userInput}"`)

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    abortControllerRef.current = new AbortController()
    const signal = abortControllerRef.current.signal;

    setSuggestions([]);
    setIsLoading(true)
    setLatency(null)
    setTimeToFirstSuggestion(null)

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/autocomplete-stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            userInput,
            conversationHistory,
            schemaDescription: selectedSchema.description,
            requestId: `req_${Date.now()}`
        }),
        signal,
      });

      if (!response.ok || !response.body) {
          throw new Error('Network response was not ok.');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
              if (line.startsWith('data: ')) {
                  const dataStr = line.slice(6);
                  try {
                      const data = JSON.parse(dataStr);
                      
                      if (data.done) {
                          setIsLoading(false);
                          if (data.metadata) {
                              setLatency(data.metadata.latency_ms);
                              if (data.metadata.time_to_first_suggestion_ms) {
                                setTimeToFirstSuggestion(data.metadata.time_to_first_suggestion_ms);
                              }
                          }
                          return;
                      }

                      if (data.prompt && data.sqlQuery) {
                          setSuggestions(prev => {
                            // If this is the first suggestion, capture the time roughly if not provided by backend yet
                            // (Ideally backend provides it in metadata at the end, which we handle above)
                            return [...prev, {
                              prompt: data.prompt,
                              sqlQuery: data.sqlQuery
                            }];
                          });
                          setIsDropdownOpen(true);
                          setSelectedIndex(-1);
                      }
                  } catch (e) {
                      console.error('Failed to parse SSE data:', dataStr);
                  }
              }
          }
      }
    } catch (error) {
        if ((error as Error).name === 'AbortError') {
            console.log('Request cancelled');
        } else {
            console.error('Autocomplete stream error:', error);
            setSuggestions([]);
        }
        setIsLoading(false);
    }
  }, [selectedSchema, conversationHistory])

  // Effect to fetch suggestions when debounced input changes
  useEffect(() => {
    const minChars = parseInt(process.env.NEXT_PUBLIC_MIN_CHARS_TRIGGER || '3');
    if (debouncedInput && debouncedInput.length >= minChars) {
      fetchSuggestions(debouncedInput);
    } else {
      // Clear suggestions if input is too short or empty
      setSuggestions([]);
      setIsDropdownOpen(false);
    }
  }, [debouncedInput, fetchSuggestions]);


  // Handle input changes
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value)
  }, [])

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!isDropdownOpen || suggestions.length === 0) {
      if (e.key === 'Enter' && input.trim()) {
        setConversationHistory(prev => [...prev, { role: 'user', content: input }])
        setInput('')
        setIsDropdownOpen(false)
        setSuggestions([])
      }
      return
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex(prev =>
          prev < suggestions.length - 1 ? prev + 1 : prev
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1)
        break
      case 'Enter':
        e.preventDefault()
        if (selectedIndex >= 0) {
          const selected = suggestions[selectedIndex]
          setConversationHistory(prev => [
            ...prev,
            { role: 'user', content: selected.prompt },
            { role: 'assistant', content: selected.sqlQuery }
          ])
          setInput(selected.prompt)
          setIsDropdownOpen(false)
          setSuggestions([])
        }
        break
      case 'Escape':
        e.preventDefault()
        setIsDropdownOpen(false)
        setSelectedIndex(-1)
        break
    }
  }, [isDropdownOpen, suggestions, selectedIndex, input])

  // Handle suggestion click
  const handleSuggestionClick = useCallback((suggestion: QueryOption) => {
    setConversationHistory(prev => [
      ...prev,
      { role: 'user', content: suggestion.prompt },
      { role: 'assistant', content: suggestion.sqlQuery }
    ])
    setInput(suggestion.prompt)
    setIsDropdownOpen(false)
    setSuggestions([])
    inputRef.current?.focus()
  }, [])

  const handleSchemaChange = () => {
    const currentIndex = schemas.findIndex(s => s.name === selectedSchema.name);
    const nextIndex = (currentIndex + 1) % schemas.length;
    setSelectedSchema(schemas[nextIndex]);
    
    // Optionally, clear input and suggestions when schema changes
    setInput('');
    setSuggestions([]);
    setIsDropdownOpen(false);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false)
        setSelectedIndex(-1)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="w-full">
      {/* System Prompt Box */}
      <div className="mb-8 relative">
        <div className="absolute top-4 right-4 flex items-center gap-3">
          <span className="text-xs text-gray-400">{selectedSchema.name}</span>
          <button
            onClick={handleSchemaChange}
            className="px-3 py-1 bg-[#3a3a3a] text-xs text-gray-300 rounded hover:bg-[#4a4a4a] transition-colors"
          >
            Change Schema
          </button>
        </div>
        <SchemaDisplay schemaDescription={selectedSchema.description} />
      </div>

      {/* Main Chat Interface */}
      <div className="space-y-6">
        {/* Conversation History */}
        {conversationHistory.length > 0 && (
          <div className="space-y-4 mb-8">
            {conversationHistory.map((message, index) => (
              <div key={index} className="flex gap-4">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-[#2a2a2a] flex items-center justify-center text-xs">
                  {message.role === 'user' ? '→' : '←'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-300 leading-relaxed">{message.content}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Input Area */}
        <div className="relative" ref={dropdownRef}>
          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Type your query..."
              className="w-full px-4 py-4 bg-[#252525] border border-[#2a2a2a] rounded-lg focus:outline-none focus:border-[#3a3a3a] text-base text-gray-200 placeholder-gray-500 transition-colors pr-20"
            />

            {/* Loading indicator */}
            {isLoading && (
              <div className="absolute right-4 top-1/2 -translate-y-1/2">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-600 border-t-gray-400"></div>
              </div>
            )}

            {/* Latency display */}
            {!isLoading && (
              <div className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-gray-500 font-mono flex gap-3">
                {timeToFirstSuggestion !== null && (
                  <span title="Time to First Suggestion">⚡ {timeToFirstSuggestion}ms</span>
                )}
                {latency !== null && (
                   <span title="Total Request Latency">🕒 {latency}ms</span>
                )}
              </div>
            )}
          </div>

          {/* Suggestions Dropdown */}
          {isDropdownOpen && suggestions.length > 0 && (
            <div className="absolute z-10 mt-2 w-full bg-[#1f1f1f] border border-[#2a2a2a] rounded-lg shadow-2xl max-h-[28rem] overflow-y-auto">
              {suggestions.map((suggestion, index) => (
                <div
                  key={index}
                  className={`p-4 cursor-pointer border-b border-[#2a2a2a] last:border-b-0 transition-colors ${
                    index === selectedIndex 
                      ? 'bg-[#2a2a2a]' 
                      : 'hover:bg-[#252525]'
                  }`}
                  onClick={() => handleSuggestionClick(suggestion)}
                >
                  <div className="space-y-3">
                    {/* Natural Language Prompt */}
                    <div className="flex items-start gap-3">
                      <span className="text-gray-500 text-xs mt-0.5">→</span>
                      <p className="text-sm text-gray-300 flex-1 leading-relaxed">
                        <span>{suggestions[0].prompt}</span>
                        {index > 0 && suggestion.prompt.startsWith(suggestions[0].prompt) && (
                          <span className="text-white bg-[#3a3a3a] rounded px-1.5 py-0.5 ml-2">
                            {suggestion.prompt.substring(suggestions[0].prompt.length).trim()}
                          </span>
                        )}
                        {!suggestion.prompt.startsWith(suggestions[0].prompt) && index > 0 && (
                          <span>{suggestion.prompt}</span>
                        )}
                       </p>
                     </div>
 
                     {/* SQL Query */}
                    <div className="flex items-start gap-3 pl-5">
                      <code className="text-xs bg-[#0a0a0a] px-3 py-2 rounded flex-1 font-mono text-gray-400 border border-[#2a2a2a] leading-relaxed whitespace-pre-wrap">
                        {formatSql(suggestion.sqlQuery)}
                      </code>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Hint text */}
        <p className="text-xs text-gray-600 text-center">
          Type 3+ characters and press space to trigger suggestions • ↑↓ to navigate • Enter to select • Esc to close
        </p>
      </div>
    </div>
  )
}
