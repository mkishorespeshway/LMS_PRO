import { useEffect, useRef, useState } from "react";
import { useDispatch } from "react-redux";
import { addCourseLecture } from "../../Redux/Slices/LectureSlice";
import { useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import InputBox from "../../Components/InputBox/InputBox";
import TextArea from "../../Components/InputBox/TextArea";
import Layout from "../../Layout/Layout";
import { AiOutlineArrowLeft } from "react-icons/ai";
import { axiosInstance } from "../../Helpers/axiosInstance";

export default function AddLecture() {
  const courseDetails = useLocation().state;

  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState(false);
  const videoRef = useRef(null);
  const [userInput, setUserInput] = useState({
    id: courseDetails?._id,
    lecture: undefined,
    title: "",
    description: "",
    videoSrc: "",
    videoUrl: "",
    driveUrl: "", // New field for Google Drive URL
    duration: "",
  });

  function handleInputChange(e) {
    const { name, value } = e.target;
    setUserInput((prevInput) => {
      const newState = {
        ...prevInput,
        [name]: value,
      };

      if (name === "videoUrl" && value) {
        newState.lecture = undefined;
        newState.videoSrc = "";
        newState.driveUrl = ""; // Clear driveUrl when videoUrl is entered
      } else if (name === "driveUrl" && value) {
        newState.lecture = undefined;
        newState.videoSrc = "";
        newState.videoUrl = ""; // Clear videoUrl when driveUrl is entered
      } else if (name === "lecture" && value) {
        newState.videoUrl = "";
        newState.driveUrl = ""; // Clear driveUrl when lecture file is selected
        newState.duration = "";
      }
      return newState;
    });
  }

  function handleVideo(e) {
    const videoFile = e.target.files[0];
    const source = window.URL.createObjectURL(videoFile);

    const videoElement = document.createElement('video');
    videoElement.preload = 'metadata';
    videoElement.onloadedmetadata = () => {
      window.URL.revokeObjectURL(videoElement.src);
      const duration = videoElement.duration;
      const minutes = Math.floor(duration / 60);
      const seconds = Math.floor(duration % 60);
      const formattedDuration = `${minutes}m ${seconds}s`;

      setUserInput((prevInput) => ({
        ...prevInput,
        lecture: videoFile,
        videoSrc: source,
        duration: formattedDuration,
        videoUrl: "", // Clear videoUrl when a file is selected
      }));
    };
    videoElement.src = source;
  }

  async function onFormSubmit(e) {
    e.preventDefault();
    if ((!userInput.lecture && !userInput.videoUrl && !userInput.driveUrl) || !userInput.title || !userInput.description) {
      toast.error("All fields are mandatory, and either a video file, a YouTube URL, or a Drive URL must be provided.");
      return;
    }

    if ((userInput.lecture && userInput.videoUrl) || (userInput.lecture && userInput.driveUrl) || (userInput.videoUrl && userInput.driveUrl)) {
      toast.error("Please provide only one of: a video file, a YouTube URL, or a Drive URL.");
      return;
    }

    setIsLoading(true);

    const formData = new FormData();
    if (userInput.lecture) {
      formData.append("lecture", userInput.lecture);
    } else if (userInput.driveUrl) {
      formData.append("videoUrl", userInput.driveUrl); // Send driveUrl as videoUrl to backend
    } else if (userInput.videoUrl) {
      formData.append("videoUrl", userInput.videoUrl);
    }
    formData.append("title", userInput.title);
    formData.append("description", userInput.description);
    formData.append("duration", userInput.duration);

    const data = { formData, id: userInput.id };

    const response = await dispatch(addCourseLecture(data));
    if (response?.payload?.success) {
      navigate(-1);
      setUserInput({
        id: courseDetails?._id,
        lecture: undefined,
        title: "",
        description: "",
        videoSrc: "",
        videoUrl: "",
        driveUrl: "", // Clear driveUrl after submission
        duration: "",
      });
    }
    setIsLoading(false);
  }

  useEffect(() => {
    if (!courseDetails) navigate("/courses");

    const fetchVideoDuration = async () => {
      const urlToFetch = userInput.driveUrl || userInput.videoUrl;
      
      if (!urlToFetch) return;

      // Regex patterns (matching backend validation)
      const youtubeRegex = /(?:https?:\/\/)?(?:www\.)?(?:m\.)?(?:youtube\.com|youtu\.be)\/(?:watch\?v=|embed\/|v\/|)([^\&\?\n]{11})/;
      const googleDriveRegex = /(?:https?:\/\/)?drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)(?:\/view)?(?:\?usp=sharing)?/;

      if (!youtubeRegex.test(urlToFetch) && !googleDriveRegex.test(urlToFetch)) {
          // Do not fetch if URL format is invalid to avoid 400 errors
          return;
      }

      try {
        const response = await axiosInstance.post('/courses/get-video-duration', { videoUrl: urlToFetch });
        setUserInput((prevInput) => ({ ...prevInput, duration: response.data.duration }));
      } catch (error) {
        console.error("Error fetching video duration:", error);
        // Only toast if it's a server error, not for bad requests which we try to filter client-side
        // But if we filter client-side, 400 shouldn't happen often. 
        // If it does, it might be a genuine issue, so keeping the toast but maybe making it less intrusive?
        // Actually, if we filter correctly, we shouldn't get 400.
        // If we get other errors (500), we should show toast.
        if (error.response && error.response.status !== 400) {
             toast.error("Failed to fetch video duration.");
        }
        setUserInput((prevInput) => ({ ...prevInput, duration: "" }));
      }
    };

    // Debounce the fetch to avoid too many requests while typing
    const timeoutId = setTimeout(() => {
        fetchVideoDuration();
    }, 1000);

    return () => clearTimeout(timeoutId);

  }, [courseDetails, navigate, userInput.videoUrl, userInput.driveUrl]);

  return (
    <Layout>
      <section className="flex flex-col gap-6 items-center py-8 px-3 min-h-[100vh]">
        <form
          onSubmit={onFormSubmit}
          autoComplete="off"
          noValidate
          className="flex flex-col dark:bg-base-100 gap-7 rounded-lg md:py-5 py-7 md:px-7 px-3 md:w-[750px] w-full shadow-custom dark:shadow-xl  "
        >
          <header className="flex items-center justify-center relative">
            <button
              className="absolute left-2 text-xl text-green-500"
              onClick={() => navigate(-1)}
            >
              <AiOutlineArrowLeft />
            </button>
            <h1 className="text-center dark:text-purple-500 md:text-4xl text-2xl font-bold font-inter">
              Add new lecture
            </h1>
          </header>
          <div className="w-full flex md:flex-row md:justify-between justify-center flex-col md:gap-0 gap-5">
            <div className="md:w-[48%] w-full flex flex-col gap-5">
              {/* lecture video */}
              <div className="border border-gray-300 h-[200px] flex justify-center cursor-pointer">
                {userInput.videoSrc && (
                  <video
                    muted
                    src={userInput.videoSrc}
                    controls
                    controlsList="nodownload nofullscreen"
                    disablePictureInPicture
                    className="object-fill w-full"
                    onClick={(e) => {
                      e.preventDefault();
                      videoRef.current.click();
                    }}
                  ></video>
                )}
                {!userInput.videoSrc && (
                  <label
                    className="font-[500] text-xl h-full w-full flex justify-center items-center cursor-pointer font-lato"
                    htmlFor="lecture"
                  >
                    Choose Your Video
                  </label>
                )}
                <input
                  type="file"
                  className="hidden"
                  id="lecture"
                  ref={videoRef}
                  name="lecture"
                  onChange={handleVideo}
                  accept="video/mp4, video/x-mp4, video/*"
                />
              </div>
            </div>
            <div className="md:w-[48%] w-full flex flex-col gap-5">
              {/* title */}
              <InputBox
                label={"Title"}
                name={"title"}
                type={"text"}
                placeholder={"Enter Lecture Title"}
                onChange={handleInputChange}
                value={userInput.title}
              />
              {/* description */}
              <TextArea
                label={"Description"}
                name={"description"}
                rows={5}
                type={"text"}
                placeholder={"Enter Lecture Description"}
                onChange={handleInputChange}
                value={userInput.description}
              />
              {/* video url */}
              <InputBox
                label={"Video URL"}
                name={"videoUrl"}
                type={"text"}
                placeholder={"Enter Video URL"}
                onChange={handleInputChange}
                value={userInput.videoUrl}
              />
              {/* drive url */}
              <InputBox
                label={"Drive URL"}
                name={"driveUrl"}
                type={"text"}
                placeholder={"Enter Google Drive Video URL"}
                onChange={handleInputChange}
                value={userInput.driveUrl}
              />
              {/* duration */}
              <InputBox
                label={"Duration"}
                name={"duration"}
                type={"text"}
                placeholder={"Enter Video Duration (e.g., 1h 30m)"}
                onChange={handleInputChange}
                value={userInput.duration}
              />
            </div>
          </div>

          {/* submit btn */}
          <button
            type="submit"
            disabled={isLoading}
            className="mt-3 bg-yellow-500 text-white dark:text-base-200  transition-all ease-in-out duration-300 rounded-md py-2 font-nunito-sans font-[500]  text-lg cursor-pointer"
          >
            {isLoading ? "Adding Lecture..." : "Add New Lecture"}
          </button>
        </form>
      </section>
    </Layout>
  );
}
