package az.it25patok.user;

public enum Role {
    ADMIN, TEACHER, STUDENT;

    public static Role from(String value) {
        return Role.valueOf(value.toUpperCase());
    }
}
