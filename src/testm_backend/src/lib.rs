use ic_cdk::{update, query};
use std::cell::RefCell;

thread_local! {
    static COURSES: RefCell<Vec<Course>> = RefCell::new(Vec::new());
    static VOTE_REQUESTS: RefCell<Vec<VoteRequest>> = RefCell::new(Vec::new());
    static ENROLLMENTS: RefCell<Vec<Enrollment>> = RefCell::new(Vec::new());
}

#[derive(Clone, Debug, candid::CandidType, candid::Deserialize)]
pub struct Course {
    pub id: u64,
    pub title: String,
    pub description: String,
}

#[derive(Clone, Debug, candid::CandidType, candid::Deserialize)]
pub struct VoteRequest {
    pub id: u64,
    pub course_id: u64,
    pub upvotes: u32,
    pub downvotes: u32,
}

#[derive(Clone, Debug, candid::CandidType, candid::Deserialize)]
pub struct Enrollment {
    pub student_principal: String,
    pub course_id: u64,
}

/// Create a new course
#[update]
fn create_course(title: String, description: String) {
    let course = Course {
        id: ic_cdk::api::time(),
        title,
        description,
    };
    COURSES.with(|courses| courses.borrow_mut().push(course));
}

/// Get all courses
#[query]
fn get_courses() -> Vec<Course> {
    COURSES.with(|courses| courses.borrow().clone())
}

/// Create a new vote request for a course
#[update]
fn create_vote_request(course_id: u64) {
    let vote = VoteRequest {
        id: ic_cdk::api::time(),
        course_id,
        upvotes: 0,
        downvotes: 0,
    };
    VOTE_REQUESTS.with(|votes| votes.borrow_mut().push(vote));
}

/// Get all vote requests
#[query]
fn get_vote_requests() -> Vec<VoteRequest> {
    VOTE_REQUESTS.with(|votes| votes.borrow().clone())
}

/// Upvote a vote request
#[update]
fn vote_up(vote_id: u64) {
    VOTE_REQUESTS.with(|votes| {
        if let Some(v) = votes.borrow_mut().iter_mut().find(|v| v.id == vote_id) {
            v.upvotes = v.upvotes.saturating_add(1);
        }
    });
}

/// Downvote a vote request
#[update]
fn vote_down(vote_id: u64) {
    VOTE_REQUESTS.with(|votes| {
        if let Some(v) = votes.borrow_mut().iter_mut().find(|v| v.id == vote_id) {
            v.downvotes = v.downvotes.saturating_add(1);
        }
    });
}

/// Decline (remove) a vote request
#[update]
fn decline_vote_request(vote_id: u64) {
    VOTE_REQUESTS.with(|votes| {
        votes.borrow_mut().retain(|v| v.id != vote_id);
    });
}

/// Enroll a student in a course
#[update]
fn enroll_student(student_principal: String, course_id: u64) {
    let enrollment = Enrollment {
        student_principal,
        course_id,
    };
    ENROLLMENTS.with(|enrollments| enrollments.borrow_mut().push(enrollment));
}

/// Dropout a student from a course
#[update]
fn dropout_student(student_principal: String, course_id: u64) {
    ENROLLMENTS.with(|enrollments| {
        enrollments.borrow_mut().retain(|enr| {
            !(enr.student_principal == student_principal && enr.course_id == course_id)
        });
    });
}

/// Get all enrollments
#[query]
fn get_enrollments() -> Vec<Enrollment> {
    ENROLLMENTS.with(|enrollments| enrollments.borrow().clone())
}

/// Get enrollments for a specific student
#[query]
fn get_enrollments_by_student(student_principal: String) -> Vec<Enrollment> {
    ENROLLMENTS.with(|enrollments| {
        enrollments
            .borrow()
            .iter()
            .cloned()
            .filter(|enr| enr.student_principal == student_principal)
            .collect()
    })
}
