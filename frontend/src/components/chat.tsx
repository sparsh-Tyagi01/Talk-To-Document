import { BackgroundBeamsWithCollision } from "./ui/background-beams-with-collision"

const Chat = () => {
  return (
    <div>
      <BackgroundBeamsWithCollision>
        <div className="bg-slate-950 h-screen w-screen">
          <div className="h-[85vh] w-[80vw] ">
            <div></div>
            <div></div>
          </div>
        </div>
      </BackgroundBeamsWithCollision>
    </div>
  )
}

export default Chat