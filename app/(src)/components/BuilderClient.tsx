'use client'
import { useContext, useEffect, useState } from 'react';
import StepsList from './StepsList';
import FileExplorer from './FileExplorer';
import TabView from './TabView';
import CodeEditor from './CodeEditor';
import PreviewFrame from './PreviewFrame';
import { Step, FileItem, StepType } from '../types';
import axios from 'axios';
// import { BACKEND_URL } from '../config';
import { parseXml } from '../steps';
import Loader from './Loader';
import WebContainerContext from '../webcontainer-context';

import { useSearchParams } from 'next/navigation';

export type LlmMessage = {
  role: "user" | "model";
  parts: [{ text: string }];
};

type BuilderClientProps = {
  prompt: string;
};

export default function BuilderClient({ prompt }: BuilderClientProps) {
  const [userPrompt, setPrompt] = useState("");
  const [llmMessages, setLlmMessages] = useState<LlmMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [templateSet, setTemplateSet] = useState(false);
  const webcontainer = useContext(WebContainerContext);

  const [currentStep, setCurrentStep] = useState(1);
  const [activeTab, setActiveTab] = useState<'code' | 'preview'>('code');
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
  const [steps, setSteps] = useState<Step[]>([]);
  const [files, setFiles] = useState<FileItem[]>([]);

  useEffect(() => {
    let originalFiles = [...files];
    let updateHappened = false;
    steps.filter(({status}) => status === "pending").map(step => {
      updateHappened = true;
      if (step?.type === StepType.CreateFile) {
        let parsedPath = step.path?.split("/") ?? [];
        let currentFileStructure = [...originalFiles];
        const finalAnswerRef = currentFileStructure;
        let currentFolder = ""
        while(parsedPath.length) {
          currentFolder =  `${currentFolder}/${parsedPath[0]}`;
          const currentFolderName = parsedPath[0];
          parsedPath = parsedPath.slice(1);
          if (!parsedPath.length) {
            // final file
            const file = currentFileStructure.find(x => x.path === currentFolder)
            if (!file) {
              currentFileStructure.push({
                name: currentFolderName,
                type: 'file',
                path: currentFolder,
                content: step.code?.replace(/`+$/g, '').trimEnd()
              })
            } else {
              file.content = step.code?.replace(/`+$/g, '').trimEnd();
            }
          } else {
            // in a folder
            const folder = currentFileStructure.find(x => x.path === currentFolder)
            if (!folder) {
              currentFileStructure.push({
                name: currentFolderName,
                type: 'folder',
                path: currentFolder,
                children: []
              })
            }
            currentFileStructure = currentFileStructure.find(x => x.path === currentFolder)!.children!;
          }
        }
        originalFiles = finalAnswerRef;
      }
    })

    if (updateHappened) {
      setFiles(originalFiles)
      setSteps(steps => steps.map((s: Step) => ({
        ...s,
        status: "completed" as const
      })))
    }
  }, [steps, files]);

  useEffect(() => {
    const createMountStructure = (files: FileItem[]): Record<string, unknown> => {
      const mountStructure: Record<string, unknown> = {};
      const processFile = (file: FileItem, isRootFolder: boolean) => {  
        if (file.type === 'folder') {
          mountStructure[file.name] = {
            directory: file.children ? 
              Object.fromEntries(
                file.children.map(child => [child.name, processFile(child, false)])
              ) 
              : {}
          };
        } else if (file.type === 'file') {
          if (isRootFolder) {
            mountStructure[file.name] = {
              file: {
                contents: file.content || ''
              }
            };
          } else {
            return {
              file: {
                contents: file.content || ''
              }
            };
          }
        }
        return mountStructure[file.name];
      };
      files.forEach(file => processFile(file, true));
      return mountStructure;
    };
    const mountStructure = createMountStructure(files);
    webcontainer?.mount(mountStructure);
  }, [files, webcontainer]);

  type TemplateResponse = {
    prompts: string[];
    uiPrompts: string[];
  };

  type ChatResponse = { 
    response : string; 
  }

  async function init() {
    const response = await axios.post<TemplateResponse>(`/api/template`, {
      prompt: prompt.trim()
    });
    setTemplateSet(true);
    const { prompts, uiPrompts } = response.data;
    setSteps(
      parseXml(uiPrompts[0]).map((x: Step) => ({
        ...x,
        status: "pending"
      }))
    );
    setLoading(true);
    const stepsResponse = await axios.post<ChatResponse>(`/api/chat`, {
      content: [...prompts, prompt].map(text => ({
        role: "user",
        parts: [{ text }]
      }))
    });
    setLoading(false);
    let newSteps: Step[] = [];
    try {
      newSteps = parseXml(stepsResponse.data.response).map((x: Step) => ({
        ...x,
        status: "pending" as const
      }));
    } catch (e) {
      console.error("Failed to parse LLM response as XML", e);
    }
    setSteps(s => [...s, ...newSteps]);
    setLlmMessages(
      [...prompts, prompt].map(content => ({
        role: "user",
        parts: [{ text: content }]
      }))
    );
    setLlmMessages(x => [
      ...x,
      { role: "model", parts : [{ text: stepsResponse.data.response }] }
    ]);
  }

  useEffect(() => {
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <h1 className="text-xl font-semibold text-gray-100">Website Builder</h1>
        <p className="text-sm text-gray-400 mt-1">Prompt: {prompt}</p>
      </header>
      <div className="flex-1 overflow-hidden">
        <div className="h-full grid grid-cols-4 gap-6 p-6">
          <div className="col-span-1 space-y-6 overflow-auto">
            <div>
              <div className="max-h-[75vh] overflow-scroll">
                <StepsList
                  steps={steps}
                  currentStep={currentStep}
                  onStepClick={setCurrentStep}
                />
              </div>
              <div>
                <div className='flex'>
                  <br />
                  {(loading || !templateSet) && <Loader />}
                  {!(loading || !templateSet) && <div className='flex'>
                    <textarea value={userPrompt} onChange={(e) => {
                    setPrompt(e.target.value)
                  }} className='p-2 w-full'></textarea>
                  <button onClick={async () => {
                    const newMessage: LlmMessage = {
                      role: "user",
                      parts: [{ text: userPrompt }]
                    };
                    setLoading(true);
                    const stepsResponse = await axios.post<ChatResponse>(`/api/chat`, {
                      content: [...llmMessages, newMessage]
                    });
                    setLoading(false);
                    setLlmMessages(x => [...x, newMessage]);
                    setLlmMessages(x => [...x, {
                      role: "model",
                      parts: [{
                        text : stepsResponse.data.response
                      }]
                    }]);
                    setSteps(s => [...s, ...parseXml(stepsResponse.data.response).map(x => ({
                      ...x,
                      status: "pending" as const
                    }))]);
                  }} className='bg-purple-400 px-4'>Send</button>
                  </div>}
                </div>
              </div>
            </div>
          </div>
          <div className="col-span-1">
              <FileExplorer 
                files={files} 
                onFileSelect={setSelectedFile}
              />
            </div>
          <div className="col-span-2 bg-gray-900 rounded-lg shadow-lg p-4 h-[calc(100vh-8rem)]">
            <TabView activeTab={activeTab} onTabChange={setActiveTab} />
            <div className="h-[calc(100%-4rem)]">
              {activeTab === 'code' ? (
                <CodeEditor file={selectedFile} />
              ) : (
                <PreviewFrame webContainer={webcontainer!} files={files} />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}