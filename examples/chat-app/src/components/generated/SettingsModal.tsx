import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Moon, Sun, Monitor, Palette, Bell, Shield, HelpCircle, Download } from 'lucide-react';
interface SettingsModalProps {
  onClose: () => void;
}

// @component: SettingsModal
export const SettingsModal = ({
  onClose
}: SettingsModalProps) => {
  const [activeTab, setActiveTab] = useState('appearance');
  const [theme, setTheme] = useState('light');
  const [notifications, setNotifications] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const tabs = [{
    id: 'appearance',
    label: 'Appearance',
    icon: Palette
  }, {
    id: 'notifications',
    label: 'Notifications',
    icon: Bell
  }, {
    id: 'privacy',
    label: 'Privacy',
    icon: Shield
  }, {
    id: 'help',
    label: 'Help',
    icon: HelpCircle
  }] as any[];
  const themeOptions = [{
    id: 'light',
    label: 'Light',
    icon: Sun
  }, {
    id: 'dark',
    label: 'Dark',
    icon: Moon
  }, {
    id: 'system',
    label: 'System',
    icon: Monitor
  }] as any[];

  // @return
  return <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <motion.div initial={{
        opacity: 0
      }} animate={{
        opacity: 1
      }} exit={{
        opacity: 0
      }} className="absolute inset-0 bg-black bg-opacity-50" onClick={onClose} />
        
        <motion.div initial={{
        opacity: 0,
        scale: 0.95,
        y: 20
      }} animate={{
        opacity: 1,
        scale: 1,
        y: 0
      }} exit={{
        opacity: 0,
        scale: 0.95,
        y: 20
      }} className="relative w-full max-w-2xl mx-4 bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-100">
            <h2 className="text-xl font-semibold text-gray-900">Settings</h2>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <X size={20} className="text-gray-500" />
            </button>
          </div>

          <div className="flex h-96">
            {/* Sidebar */}
            <div className="w-48 bg-gray-50 border-r border-gray-100">
              <nav className="p-4 space-y-1">
                {tabs.map(tab => {
                const Icon = tab.icon;
                return <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`w-full flex items-center gap-3 px-3 py-2.5 text-left rounded-lg transition-colors ${activeTab === tab.id ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'}`}>
                      <Icon size={18} />
                      <span className="font-medium">{tab.label}</span>
                    </button>;
              })}
              </nav>
            </div>

            {/* Content */}
            <div className="flex-1 p-6 overflow-y-auto">
              {activeTab === 'appearance' && <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Theme</h3>
                    <div className="grid grid-cols-3 gap-3">
                      {themeOptions.map(option => {
                    const Icon = option.icon;
                    return <button key={option.id} onClick={() => setTheme(option.id)} className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${theme === option.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                            <Icon size={24} className={theme === option.id ? 'text-blue-600' : 'text-gray-600'} />
                            <span className={`text-sm font-medium ${theme === option.id ? 'text-blue-700' : 'text-gray-700'}`}>
                              {option.label}
                            </span>
                          </button>;
                  })}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Font Size</h3>
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-gray-600">Small</span>
                      <input type="range" min="12" max="18" defaultValue="14" className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer" />
                      <span className="text-sm text-gray-600">Large</span>
                    </div>
                  </div>
                </div>}

              {activeTab === 'notifications' && <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">Push Notifications</h3>
                      <p className="text-sm text-gray-500">Receive notifications for new messages</p>
                    </div>
                    <button onClick={() => setNotifications(!notifications)} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${notifications ? 'bg-blue-600' : 'bg-gray-200'}`}>
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${notifications ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">Sound Effects</h3>
                      <p className="text-sm text-gray-500">Play sounds for message notifications</p>
                    </div>
                    <button onClick={() => setSoundEnabled(!soundEnabled)} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${soundEnabled ? 'bg-blue-600' : 'bg-gray-200'}`}>
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${soundEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                  </div>
                </div>}

              {activeTab === 'privacy' && <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Data Management</h3>
                    <div className="space-y-3">
                      <button className="w-full flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                        <span className="text-gray-700">Export Chat History</span>
                        <Download size={18} className="text-gray-500" />
                      </button>
                      <button className="w-full flex items-center justify-between p-3 bg-red-50 rounded-lg hover:bg-red-100 transition-colors text-red-700">
                        <span>Clear All Data</span>
                        <X size={18} />
                      </button>
                    </div>
                  </div>
                </div>}

              {activeTab === 'help' && <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Support</h3>
                    <div className="space-y-3">
                      <div className="p-4 bg-blue-50 rounded-lg">
                        <h4 className="font-medium text-blue-900 mb-2">Version 1.0.0</h4>
                        <p className="text-sm text-blue-700">You're using the latest version of the AI Chat interface.</p>
                      </div>
                      <button className="w-full text-left p-3 hover:bg-gray-50 rounded-lg transition-colors">
                        <span className="text-gray-700">Documentation</span>
                      </button>
                      <button className="w-full text-left p-3 hover:bg-gray-50 rounded-lg transition-colors">
                        <span className="text-gray-700">Contact Support</span>
                      </button>
                    </div>
                  </div>
                </div>}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-100 bg-gray-50">
            <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors">
              Cancel
            </button>
            <button onClick={onClose} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              Save Changes
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>;
};