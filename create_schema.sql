create table
    courses (
        id integer primary key autoincrement,
        name text not null,
        canvasId integer not null,
        canvasVerantAssignmentId integer,
        canvasGroups text,
        githubStudentOrg text,
        githubVerantAssignment text,
        githubProjectAssignment text,
        lastRepoCheck text,
        lastSectionCheck text,
        lastMappingCheck text
    );

create table
    sections (
        id integer primary key autoincrement,
        name text not null,
        courseId integer not null references courses (id)
    );

create table
    students (
        id integer primary key,
        email text not null,
        name text not null
    );

create table
    students_sections (
        studentId integer not null references students (id),
        sectionId integer not null references sections (id),
        primary key (studentId, sectionId)
    );

create table githubAccounts(
    username text primary key,
    studentId integer not null references students (id)
);

create table githubCommitNames(
    id integer primary key autoincrement,
    name text not null,
    email text
);

create table
    students_githubCommitNames (
        studentId integer not null references students (id),
        githubCommitNameId integer not null references githubCommitNames (id),
        primary key (studentId, githubCommitNameId)
);

create table 
    repositories (        
        courseId integer not null references courses (id),        
        organization text,
        name text,
        full_name text,
        priv boolean,
        html_url text,
        ssh_url text,
        api_url text,
        created_at text,
        updated_at text,       
        lastMemberCheck text,
        primary key (organization, name)
    );

create table repository_members(
    organization text not null references repositories(organization),
    name text not null references repositories(name),
    username text not null references githubAccounts(username)
);