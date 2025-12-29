import React from "react";
import { Route, Routes } from "react-router-dom";

import RequireAuth from "./Components/auth/RequireAuth";
import AboutUs from "./Pages/About";
import Contact from "./Pages/Contact";
import CreateCourse from "./Pages/Course/CreateCourse";
import CourseDescription from "./Pages/Course/CourseDescription";
import CourseList from "./Pages/Course/CourseList";
import AddLecture from "./Pages/Dashboard/AddLecture";
import AddQuiz from "./Pages/Dashboard/AddQuiz";
import AdminDashboard from "./Pages/Dashboard/AdminDashboard";
import EnrolledStudents from './pages/dashboard/EnrolledStudents';
import DisplayLecture from "./Pages/Dashboard/DisplayLecture";
import Denied from "./Pages/Denied";
import HomePage from "./Pages/HomePage";
import Login from "./Pages/Login";
import NotFound from "./Pages/NotFound";
import ChangePassword from "./Pages/Password/ChangePassword";
import ForgotPassword from "./Pages/Password/ForgotPassword";
import ResetPassword from "./Pages/Password/ResetPassword";
import Checkout from "./Pages/Payment/Checkout";
import CheckoutFail from "./Pages/Payment/CheckoutFail";
import CheckoutSuccess from "./Pages/Payment/CheckoutSuccess";
import Signup from "./Pages/Signup";
import Profile from "./Pages/User/Profile";
import MyCourses from "./Pages/User/MyCourses";

function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/about" element={<AboutUs />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/denied" element={<Denied />} />

        <Route path="/signup" element={<Signup />} />
        <Route path="/login" element={<Login />} />
        <Route
          path="/user/profile/reset-password"
          element={<ForgotPassword />}
        />
        <Route
          path="/user/profile/reset-password/:resetToken"
          element={<ResetPassword />}
        />

        <Route path="/courses" element={<CourseList />} />
        <Route path="/courses/description" element={<CourseDescription />} />

        <Route element={<RequireAuth allowedRoles={["ADMIN"]} />}>
          <Route path="/course/create" element={<CreateCourse />} />
          <Route path="/course/addlecture" element={<AddLecture />} />
          <Route path="/course/addquiz" element={<AddQuiz />} />
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/course/students" element={<EnrolledStudents />} />
        </Route>

        <Route element={<RequireAuth allowedRoles={["USER", "ADMIN"]} />}>
          <Route path="/user/profile" element={<Profile />} />
          <Route path="/user/profile/change-password" element={<ChangePassword />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/checkout/success" element={<CheckoutSuccess />} />
          <Route path="/checkout/fail" element={<CheckoutFail />} />
          <Route path="/course/displaylectures" element={<DisplayLecture />} />
          <Route path="/user/my-courses" element={<MyCourses />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
}

export default App;
