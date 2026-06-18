import React from 'react';
import { useEditorStore } from '@/stores/editorStore';
import { usePresetStore } from '@/stores/presetStore';
import { censorText } from '@/lib/textCensorship';
import { applyBlur, applySharpen, applyPixelation } from '@/lib/imageFilters';

export default function FeatureTest() {
  const { objects, addObject } = useEditorStore();
  const { presets } = usePresetStore();
  
  const testCensorship = () => {
    const testText = "This is some shit and fucking bullshit!";
    const censored = censorText(testText);
    console.log('Original:', testText);
    console.log('Censored:', censored);
    alert(`Censorship Test:\nOriginal: ${testText}\nCensored: ${censored}`);
  };
  
  const testFilters = () => {
    // Create a test image element
    const canvas = document.createElement('canvas');
    canvas.width = 100;
    canvas.height = 100;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = 'red';
      ctx.fillRect(0, 0, 100, 100);
      ctx.fillStyle = 'white';
      ctx.font = '20px Arial';
      ctx.fillText('TEST', 20, 60);
    }
    
    // Test blur
    const blurred = applyBlur(canvas, 5);
    console.log('Blur applied:', blurred);
    
    // Test sharpen
    const sharpened = applySharpen(canvas, 10);
    console.log('Sharpen applied:', sharpened);
    
    // Test pixelation
    const pixelated = applyPixelation(canvas, 10);
    console.log('Pixelation applied:', pixelated);
    
    alert('Filter tests completed. Check console for results.');
  };
  
  const testPreset = () => {
    console.log('Current presets:', presets);
    alert(`Preset Test:\nLoaded ${presets.length} presets`);
  };
  
  const testCanvasObject = () => {
    // Create a test text object with censorship
    const testObject = {
      id: 'test-' + Date.now(),
      type: 'text' as const,
      x: 100,
      y: 100,
      width: 200,
      height: 50,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      opacity: 1,
      visible: true,
      locked: false,
      name: 'Test Text',
      text: 'This is some fucking shit!',
      fontSize: 24,
      fontFamily: 'Arial',
      fill: '#ffffff',
      useCensorship: true,
      blur: 0,
      sharpen: 0,
      pixelation: 0,
    };
    
    addObject(testObject);
    alert('Test object with censorship added to canvas');
  };
  
  return (
    <div className="p-4 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800">
      <h3 className="text-lg font-bold mb-4">Feature Test Panel</h3>
      
      <div className="space-y-2">
        <button
          onClick={testCensorship}
          className="w-full p-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Test Text Censorship
        </button>
        
        <button
          onClick={testFilters}
          className="w-full p-2 bg-green-500 text-white rounded hover:bg-green-600"
        >
          Test Image Filters
        </button>
        
        <button
          onClick={testPreset}
          className="w-full p-2 bg-purple-500 text-white rounded hover:bg-purple-600"
        >
          Test Preset System
        </button>
        
        <button
          onClick={testCanvasObject}
          className="w-full p-2 bg-orange-500 text-white rounded hover:bg-orange-600"
        >
          Add Test Object with Censorship
        </button>
      </div>
      
      <div className="mt-4 text-sm text-slate-600 dark:text-slate-300">
        <p><strong>Features Implemented:</strong></p>
        <ul className="list-disc list-inside space-y-1">
          <li>✅ Text censorship with random character replacement (!, #, @)</li>
          <li>✅ Blur filter for images</li>
          <li>✅ Sharpen filter for images</li>
          <li>✅ Pixelation filter for images</li>
          <li>✅ Complete project presets</li>
          <li>✅ Text-only presets</li>
          <li>✅ Preset management UI</li>
          <li>✅ Filter controls in Properties Panel</li>
          <li>✅ New tools in Toolbar</li>
        </ul>
      </div>
    </div>
  );
}