import { useNavigate } from "react-router-dom";
import { LampContainer } from "./ui/lamp"
import { motion } from "motion/react";

const Homepage = () => {

  const navigate = useNavigate()

  return (
    <LampContainer>
      <motion.div
        initial={{ opacity: 0.5, y: 100 }}
        whileInView={{ opacity: 1, y: 30 }}
        transition={{
          delay: 0.3,
          duration: 0.8,
          ease: "easeInOut",
        }}
        className="mt-8 bg-gradient-to-br from-slate-300 to-slate-500 py-4 bg-clip-text text-center text-4xl font-medium tracking-tight text-transparent md:text-7xl flex flex-col items-center"
      >
        Text To Document <br /> Your documents, your AI assistant
        <button onClick={()=> navigate('/chat')} className="text-white text-3xl bg-emerald-600 px-4 py-2 rounded-2xl mt-10 cursor-pointer">Get Started</button>
      </motion.div>
    </LampContainer>
  )
}

export default Homepage