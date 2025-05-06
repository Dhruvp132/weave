// 'use client'
// import  { useContext, useEffect, useState } from 'react';
// import StepsList  from '../components/StepsList';
// import  FileExplorer  from '../components/FileExplorer';
// import TabView from '../components/TabView';
// import  CodeEditor  from '../components/CodeEditor';
// import PreviewFrame from '../components/PreviewFrame';
// import { Step, FileItem, StepType } from '../types';
// import axios from 'axios';
// import { BACKEND_URL } from '../config';
// import { parseXml } from '../steps';
// // import { useWebContainer } from '../hooks/useWebContainer';
// // import { FileNode } from '@webcontainer/api';
// import  Loader  from '../components/Loader';
// import { useSearchParams } from 'next/navigation';
// import WebContainerContext from '../webcontainer-context';

// export type LlmMessage = {
//   role: "user" | "model";
//   parts: [{ text: string }];
// };

// // const MOCK_FILE_CONTENT = `// This is a sample file content
// // import React from 'react';

// // function Component() {
// //   return <div>Hello World</div>;
// // }

// // export default Component;`;

// export default function Builder() {
//   // const location = useLocation();
//   // const { prompt } = location.state as { prompt: string };
//   const searchParams = useSearchParams();
//   const prompt = searchParams.get('prompt') || '';
//   console.log("prompt ==========>>>>>>>>", prompt)
//   const [userPrompt, setPrompt] = useState("");
//   const [llmMessages, setLlmMessages] = useState<{role: "user" | "model", parts :[ { text : string }]}[]>([]);
//   const [loading, setLoading] = useState(false);
//   const [templateSet, setTemplateSet] = useState(false);
//   // const webcontainer = useWebContainer();
//   const webcontainer = useContext(WebContainerContext);

//   const [currentStep, setCurrentStep] = useState(1);
//   const [activeTab, setActiveTab] = useState<'code' | 'preview'>('code');
//   const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
  
//   const [steps, setSteps] = useState<Step[]>([]);

//   const [files, setFiles] = useState<FileItem[]>([]);

//   useEffect(() => {
//     let originalFiles = [...files];
//     let updateHappened = false;
//     steps.filter(({status}) => status === "pending").map(step => {
//       updateHappened = true;
//       if (step?.type === StepType.CreateFile) {
//         let parsedPath = step.path?.split("/") ?? []; // ["src", "components", "App.tsx"]
//         console.log("parsedPath ==========>>>>>>>>", parsedPath)
//         let currentFileStructure = [...originalFiles]; // {}
//         const finalAnswerRef = currentFileStructure;
  
//         let currentFolder = ""
//         while(parsedPath.length) {
//           currentFolder =  `${currentFolder}/${parsedPath[0]}`;
//           const currentFolderName = parsedPath[0];
//           console.log("currentFolder ==========>>>>>>>>", currentFolderName) //this returns the folder name like this: parsedPath ==========>>>>>>>> ['eslint.config.js']
//           parsedPath = parsedPath.slice(1);
//           console.log("parsedPath ==========>>>>>>>>============>>>>>>>>", parsedPath) // this retrurns this: package.json as slice(1) startIndex 1 to end 

//           console.log("parsedPathlength ==========>>>>>>>>", parsedPath.length)
//           if (!parsedPath.length) {
//             // final file
//             const file = currentFileStructure.find(x => x.path === currentFolder)
//             if (!file) {
//               currentFileStructure.push({
//                 name: currentFolderName,
//                 type: 'file',
//                 path: currentFolder,
//                 content: step.code?.replace(/`+$/g, '').trimEnd() // Remove trailing backticks
//               })
//             } else {
//               file.content = step.code?.replace(/`+$/g, '').trimEnd(); // Remove trailing backticks
//             }
//           } else {
//             /// in a folder
//             const folder = currentFileStructure.find(x => x.path === currentFolder)
//             if (!folder) {
//               // create the folder
//               currentFileStructure.push({
//                 name: currentFolderName,
//                 type: 'folder',
//                 path: currentFolder,
//                 children: []
//               })
//             }
  
//             // go to the folder, suppose its inside the src/components then we need to go to src/components
//             currentFileStructure = currentFileStructure.find(x => x.path === currentFolder)!.children!;
//           }
//         }
//         originalFiles = finalAnswerRef;
//       }

//     })

//     if (updateHappened) {
//       console.log("updateHappened ==========>>>>>>>>", updateHappened)
//       setFiles(originalFiles)
//       setSteps(steps => steps.map((s: Step) => {
//         return {
//           ...s,
//           status: "completed" as const
//         }
        
//       }))
//     }
//     console.log(files);
//   }, [steps, files]);

//   useEffect(() => {
//     const createMountStructure = (files: FileItem[]): Record<string, unknown> => {
//       const mountStructure: Record<string, unknown> = {};
  
//       const processFile = (file: FileItem, isRootFolder: boolean) => {  
//         if (file.type === 'folder') {
//           // For folders, create a directory entry
//           mountStructure[file.name] = {
//             directory: file.children ? 
//               Object.fromEntries(
//                 file.children.map(child => [child.name, processFile(child, false)])
//               ) 
//               : {}
//           };
//         } else if (file.type === 'file') {
//           if (isRootFolder) {
//             mountStructure[file.name] = {
//               file: {
//                 contents: file.content || ''
//               }
//             };
//           } else {
//             // For files, create a file entry with contents
//             return {
//               file: {
//                 contents: file.content || ''
//               }
//             };
//           }
//         }
  
//         return mountStructure[file.name];
//       };
  
//       // Process each top-level file/folder
//       files.forEach(file => processFile(file, true));
  
//       return mountStructure;
//     };
  
//     const mountStructure = createMountStructure(files);
  
//     // Mount the structure if WebContainer is available
//     console.log(mountStructure);
//     webcontainer?.mount(mountStructure);
//   }, [files, webcontainer]);


//   type TemplateResponse = {
//     prompts: string[];
//     uiPrompts: string[];
//   };

//   type ChatResponse = { 
//     response : string; 
//   }

//   async function init() {
//     const response = await axios.post<TemplateResponse>(`${BACKEND_URL}/api/template`, {
//       prompt: prompt.trim()
//     });
//     setTemplateSet(true);
  
//     const { prompts, uiPrompts } = response.data;
  
//     // Parse initial UI steps
//     setSteps(
//       parseXml(uiPrompts[0]).map((x: Step) => ({
//         ...x,
//         status: "pending"
//       }))
//     );
  
//     setLoading(true);
//     const stepsResponse = await axios.post<ChatResponse>(`${BACKEND_URL}/api/chat`, {
//       content: [...prompts, prompt].map(text => ({
//         role: "user",
//         parts: [{ text }]
//       }))
//     });
//     setLoading(false);
  
//     // Parse the LLM response string as XML
//     let newSteps: Step[] = [];
//     try {
//       // this is returning the whole XML string / whole code for the application that you have to build 
//       // console.log("parsed stepsResponse ==========>>>>>>>>", parseXml(stepsResponse.data.response))
//       // example output of parseXML is like this: 
//       newSteps = parseXml(stepsResponse.data.response).map((x: Step) => ({
//         ...x,
//         status: "pending" as const
//       }));
//     } catch (e) {
//       // Optionally, handle parse errors here
//       console.error("Failed to parse LLM response as XML", e);
//     }
  
//     console.log("newSteps ==========>>>>>>>>", newSteps)  
//     setSteps(s => [...s, ...newSteps]);
  
//     setLlmMessages(
//       [...prompts, prompt].map(content => ({
//         role: "user",
//         parts: [{ text: content }]
//       }))
//     );
//     setLlmMessages(x => [
//       ...x,
//       { role: "model", parts : [{ text: stepsResponse.data.response }] }
//     ]);
//   }

//   useEffect(() => {
//     init();
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [])

//   return (
//     <div className="min-h-screen bg-gray-900 flex flex-col">
//       <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
//         <h1 className="text-xl font-semibold text-gray-100">Website Builder</h1>
//         <p className="text-sm text-gray-400 mt-1">Prompt: {prompt}</p>
//       </header>
      
//       <div className="flex-1 overflow-hidden">
//         <div className="h-full grid grid-cols-4 gap-6 p-6">
//           <div className="col-span-1 space-y-6 overflow-auto">
//             <div>
//               <div className="max-h-[75vh] overflow-scroll">
//                 <StepsList
//                   steps={steps}
//                   currentStep={currentStep}
//                   onStepClick={setCurrentStep}
//                 />
//               </div>
//               <div>
//                 <div className='flex'>
//                   <br />
//                   {(loading || !templateSet) && <Loader />}
//                   {!(loading || !templateSet) && <div className='flex'>
//                     <textarea value={userPrompt} onChange={(e) => {
//                     setPrompt(e.target.value)
//                   }} className='p-2 w-full'></textarea>
                  
//                   <button onClick={async () => {
//                     const newMessage: LlmMessage = {
//                       role: "user",
//                       parts: [{ text: userPrompt }]
//                     };

//                     setLoading(true);
//                     const stepsResponse = await axios.post<ChatResponse>(`${BACKEND_URL}/api/chat`, {
//                       content: [...llmMessages, newMessage]
//                     });
//                     setLoading(false);

//                     setLlmMessages(x => [...x, newMessage]);
//                     setLlmMessages(x => [...x, {
//                       role: "model",
//                       parts: [{
//                         text : stepsResponse.data.response
//                       }]
//                     }]);
                    
//                     setSteps(s => [...s, ...parseXml(stepsResponse.data.response).map(x => ({
//                       ...x,
//                       status: "pending" as const
//                     }))]);

//                   }} className='bg-purple-400 px-4'>Send</button>
//                   </div>}
//                 </div>
//               </div>
//             </div>
//           </div>
//           <div className="col-span-1">
//               <FileExplorer 
//                 files={files} 
//                 onFileSelect={setSelectedFile}
//               />
//             </div>
//           <div className="col-span-2 bg-gray-900 rounded-lg shadow-lg p-4 h-[calc(100vh-8rem)]">
//             <TabView activeTab={activeTab} onTabChange={setActiveTab} />
//             <div className="h-[calc(100%-4rem)]">
//               {activeTab === 'code' ? (
//                 <CodeEditor file={selectedFile} />
//               ) : (
//                 <PreviewFrame webContainer={webcontainer!} files={files} />
//               )}
//             </div>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }

'use client'
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import BuilderClient from '../components/BuilderClient';

function BuilderPageInner() {
  const searchParams = useSearchParams();
  const prompt = searchParams.get('prompt') || '';
  return <BuilderClient prompt={prompt} />;
}

export default function BuilderPage() {
  return (
    <Suspense>
      <BuilderPageInner />
    </Suspense>
  );
}