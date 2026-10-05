```groovy
// Declarative pipeline. Job type: "Pipeline script from SCM" (checkout is implicit).
// Required Jenkins credentials (IDs):
//   dockerhub                     Username with password (Docker Hub)
//   spendwise-postgres-password   Secret text
//   spendwise-jwt-secret          Secret text (32+ characters)
//   spendwise-llm-api-url         Secret text
//   spendwise-llm-model           Secret text
//   spendwise-llm-api-key         Secret text
pipeline {
    agent any

    options {
        disableConcurrentBuilds()
    }

    triggers {
        pollSCM('H/2 * * * *')
    }

    environment {
        TAG            = "${env.BUILD_NUMBER}"
        KARATE_VERSION = '1.4.1'
        TEST_PORT      = '18081'
        DEPLOY_PORT    = '8081'
    }

    stages {
        stage('Backend Tests') {
            steps {
                dir('backend') {
                    sh 'mvn -B test'
                }
            }
        }

        stage('Build Images') {
            steps {
                withCredentials([usernamePassword(credentialsId: 'dockerhub',
                        usernameVariable: 'DOCKER_USER', passwordVariable: 'DOCKER_PASS')]) {
                    sh 'docker compose build'
                }
            }
        }

        stage('Karate API Tests') {
            steps {
                withCredentials([usernamePassword(credentialsId: 'dockerhub',
                        usernameVariable: 'DOCKER_USER', passwordVariable: 'DOCKER_PASS')]) {
                    sh '''
                        # Throwaway stack: separate project name and port, test-only secrets.
                        export FRONTEND_PORT=$TEST_PORT
                        export POSTGRES_PASSWORD=test-only-password
                        export JWT_SECRET=test-only-jwt-secret-for-ci-run-0123456789abcdef

                        docker compose -p spendwise-test up -d --no-build
                        curl -sf --retry 40 --retry-delay 3 --retry-connrefused --retry-all-errors \
                            http://localhost:$TEST_PORT/api/health

                        if [ ! -f karate-$KARATE_VERSION.jar ]; then
                            curl -fsSL -o karate-$KARATE_VERSION.jar \
                                https://github.com/karatelabs/karate/releases/download/v$KARATE_VERSION/karate-$KARATE_VERSION.jar
                        fi

                        cd karate
                        java -Dkarate.config.dir=. -Dbase.url=http://localhost:$TEST_PORT \
                            -jar ../karate-$KARATE_VERSION.jar -t '~@ai' features
                    '''
                }
            }
            post {
                always {
                    withCredentials([usernamePassword(credentialsId: 'dockerhub',
                            usernameVariable: 'DOCKER_USER', passwordVariable: 'DOCKER_PASS')]) {
                        sh '''
                            docker compose -p spendwise-test logs --no-color --tail=100 backend || true
                            docker compose -p spendwise-test down -v
                        '''
                    }
                }
            }
        }

        stage('Push Images') {
            steps {
                withCredentials([usernamePassword(credentialsId: 'dockerhub',
                        usernameVariable: 'DOCKER_USER', passwordVariable: 'DOCKER_PASS')]) {
                    sh '''
                        echo "$DOCKER_PASS" | docker login -u "$DOCKER_USER" --password-stdin
                        docker compose push backend frontend
                        docker logout
                    '''
                }
            }
        }

        stage('Deploy') {
            steps {
                withCredentials([
                    usernamePassword(credentialsId: 'dockerhub',
                            usernameVariable: 'DOCKER_USER', passwordVariable: 'DOCKER_PASS'),
                    string(credentialsId: 'spendwise-postgres-password', variable: 'POSTGRES_PASSWORD'),
                    string(credentialsId: 'spendwise-jwt-secret', variable: 'JWT_SECRET'),
                    string(credentialsId: 'spendwise-llm-api-url', variable: 'LLM_API_URL'),
                    string(credentialsId: 'spendwise-llm-model', variable: 'LLM_MODEL'),
                    string(credentialsId: 'spendwise-llm-api-key', variable: 'LLM_API_KEY')
                ]) {
                    sh '''
                        export FRONTEND_PORT=$DEPLOY_PORT

                        echo "$DOCKER_PASS" | docker login -u "$DOCKER_USER" --password-stdin
                        docker compose -p spendwise pull backend frontend
                        docker logout

                        # No -v: production data (the pgdata volume) is never deleted.
                        docker compose -p spendwise up -d --no-build

                        curl -sf --retry 30 --retry-delay 3 --retry-connrefused --retry-all-errors \
                            http://localhost:$DEPLOY_PORT/api/health
                    '''
                }
            }
        }
    }
}
