import { useEffect, useRef, useState } from "react";
import { BackgroundBeamsWithCollision } from "./ui/background-beams-with-collision";
import { BackgroundGradient } from "./ui/background-gradient";
import { PlaceholdersAndVanishInput } from "./ui/placeholders-and-vanish-input";
import { axiosInstance } from "@/lib/axios";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const Chat = () => {
  const placeholders = [
    "Ask anything from your document",
    "What is the name of employee in doc?",
    "Title of this file?",
    "Give brief description...",
    "Tell me the following things.",
  ];

  const [messageHistory, setMessageHistory] = useState<
    { text: string; sender: "me" | "ai" }[]
  >([]);
  const [message, setMessage] = useState("");
  const [uploading, setUploading] = useState(false);
  const [loadingResponse, setLoadingResponse] = useState(false);
  const [files, setFiles] = useState<string[]>([]);
  const [status, setStatus] = useState(true)
  const chatContainerRef = useRef<HTMLDivElement>(null)

  useEffect(()=>{
    if(chatContainerRef.current){
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
    }
  },[messageHistory, loadingResponse])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessage(e.target.value);
  };

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!message.trim()) return;
    setStatus(false)

    setMessageHistory((prev) => [...prev, { text: message, sender: "me" }]);
    setLoadingResponse(true);
    setMessage("");

    try {
      const res = await axiosInstance.post("/chat", { user_input: message });
      setMessageHistory((prev) => [...prev, { text: res.data, sender: "ai" }]);
    } catch (err) {
      setMessageHistory((prev) => [
        ...prev,
        { text: "Something went wrong!", sender: "ai" },
      ]);
    } finally {
      setLoadingResponse(false);
    }
  };

  const handleUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      alert("Please select a file first!");
      return;
    }

    setUploading(true);
    try {
      const res = await axiosInstance.post("/uploads", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      alert("File uploaded successfully!");
      console.log(res.data);
    } catch (error) {
      console.error("Upload failed:", error);
      alert("Error uploading file");
    } finally {
      setUploading(false);
    }
  };

  useEffect(() => {
    const fetchfiles = async () => {
      try {
        const res = await axiosInstance.get("/files");
        setFiles(res.data.files);
      } catch (error) {
        console.error("Error fetching files: ", error);
      }
    };

    fetchfiles();
  }, []);

  return (
    <div>
      <BackgroundBeamsWithCollision>
        <div className="bg-slate-950 h-screen w-screen flex justify-center items-center">
          <BackgroundGradient className="rounded-[22px] h-[85vh] w-[80vw] p-4  bg-zinc-900 flex">
            <div className="h-full w-[20vw] border-r border-cyan-500 flex flex-col items-center gap-4 p-4">
              <Dialog>
                <DialogTrigger asChild>
                  <button className="bg-gradient-to-r from-cyan-400 to-blue-500 px-4 py-2 rounded-2xl font-bold cursor-pointer hover:bg-gradient-to-l transition-all">
                    Upload
                  </button>
                </DialogTrigger>

                <DialogContent className="sm:max-w-[425px] bg-slate-950 text-white">
                  <DialogHeader>
                    <DialogTitle className="font-bold text-lg">
                      Upload Document
                    </DialogTitle>
                    <DialogDescription className="text-gray-400">
                      Choose a PDF, DOCX, or TXT file to upload.
                    </DialogDescription>
                  </DialogHeader>

                  <form onSubmit={handleUpload} className="space-y-4">
                    <div className="grid gap-2">
                      <label htmlFor="file" className="font-medium">
                        Select File
                      </label>
                      <input
                        type="file"
                        id="file"
                        name="file"
                        accept=".pdf,.docx,.txt"
                        className="border border-gray-700 rounded-lg p-2 bg-slate-900 text-white"
                      />
                    </div>

                    <DialogFooter className="flex justify-between items-center">
                      <DialogClose asChild>
                        <button
                          type="button"
                          className="text-gray-400 hover:text-gray-200 transition-colors"
                        >
                          Cancel
                        </button>
                      </DialogClose>

                      <button
                        type="submit"
                        className="bg-gradient-to-r from-emerald-400 to-cyan-500 px-4 py-2 rounded-lg font-semibold hover:bg-gradient-to-l transition-all flex items-center gap-2"
                        disabled={uploading}
                      >
                        {uploading ? (
                          <>
                            <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span>
                            Uploading...
                          </>
                        ) : (
                          "Upload"
                        )}
                      </button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>

              <div className="mt-6 w-full text-white">
                <h2 className="font-semibold mb-2">📁 Uploaded Files</h2>
                <div className="flex flex-col gap-2 w-full max-h-[50vh] overflow-y-auto">
                  {files.length === 0 ? (
                    <p className="text-gray-400 text-sm">
                      No files uploaded yet.
                    </p>
                  ) : (
                    files.map((file, i) => (
                      <div key={i} className="flex justify-around items-center">
                        <button
                          onClick={async () => {
                            try {
                              await axiosInstance.delete(`/delete/${file}`);
                              alert(`Deleted: ${file}`);
                              setFiles((prev) => prev.filter((f) => f != file));
                            } catch (error) {
                              console.error("Error in deleting file: ", error);
                              alert("Failed to delete file");
                            }
                          }}
                          className="cursor-pointer"
                        >
                          🪣
                        </button>
                        <button
                          onClick={() =>
                            window.open(
                              `${axiosInstance.defaults.baseURL}/files/${file}`,
                              "_blank"
                            )
                          }
                          className="text-left bg-slate-800 hover:bg-slate-700 p-2 rounded-md transition"
                        >
                          {file}
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="h-full w-[80vw] flex flex-col justify-between">
              <div className="w-full h-[90%] ml-5 mb-5 overflow-y-auto" ref={chatContainerRef}>
                {messageHistory.map((msg, i) => (
                  <div
                    key={i}
                    className={`flex ${
                      msg.sender === "me" ? "justify-end" : "justify-start"
                    } mb-2 mr-4`}
                  >
                    <div
                      className={`text-base text-white py-2 px-4 rounded-xl max-w-[60%] break-words shadow-md ${
                        msg.sender === "me"
                          ? "bg-gradient-to-r from-emerald-400 to-cyan-500"
                          : "bg-gradient-to-r from-blue-600 to-fuchsia-400"
                      }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                ))}

                {loadingResponse && (
                  <div className="flex justify-start mb-3 ml-2">
                    <div className="bg-gradient-to-r from-blue-600 to-fuchsia-400 text-white py-2 px-4 rounded-xl flex gap-1 items-center">
                      <span className="w-2 h-2 bg-white rounded-full animate-bounce"></span>
                      <span className="w-2 h-2 bg-white rounded-full animate-bounce delay-150"></span>
                      <span className="w-2 h-2 bg-white rounded-full animate-bounce delay-300"></span>
                    </div>
                  </div>
                )}

                {status && (
                  <div className="w-full h-full flex flex-col justify-center items-center">
                    <h1 className="text-white/60 font-extrabold text-4xl">Talk with your Document </h1>
                    <p className="text-white/40 font-bold text-2xl">Files behave like an AI assistant</p>
                    <p className="text-9xl">📖</p>
                  </div>
                )}
              </div>

              <PlaceholdersAndVanishInput
                placeholders={placeholders}
                onChange={handleChange}
                onSubmit={onSubmit}
              />
            </div>
          </BackgroundGradient>
        </div>
      </BackgroundBeamsWithCollision>
    </div>
  );
};

export default Chat;
