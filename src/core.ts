type User = {
    name: string;
};

type Team = {
    members: User[];
    name: string;
}

type Repo = {
    name: string;
}

type Project = {
    name: string;
}

type Course = {
    name: string;
}

export type CourseConfig = {
    canvasCourseId: number;
    canvasVerantwoordingAssignmentId: number;
    canvasGroupsName: string;

    githubStudentOrg: string;
    verantwoordingAssignmentName: string;
    projectAssignmentName: string;
}
