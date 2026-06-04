@echo off
setlocal

set DIRNAME=%~dp0
if "%DIRNAME%" == "" set DIRNAME=.
if "%DIRNAME:~-1%" == "\" set DIRNAME=%DIRNAME:~0,-1%

set WRAPPER_JAR="%DIRNAME%\.mvn\wrapper\maven-wrapper.jar"
set WRAPPER_PROPERTIES="%DIRNAME%\.mvn\wrapper\maven-wrapper.properties"

if not exist "%DIRNAME%\.mvn\wrapper" md "%DIRNAME%\.mvn\wrapper"

@rem Find Java
if not "%JAVA_HOME%" == "" goto valUseJavaHome

set JAVA_EXE=java.exe
%JAVA_EXE% -version >NUL 2>&1
if "%ERRORLEVEL%" == "0" goto init

echo.
echo ERROR: JAVA_HOME is not set and no 'java' command could be found in your PATH.
goto fail

:valUseJavaHome
set "JAVA_HOME=%JAVA_HOME:"=%"
set JAVA_EXE="%JAVA_HOME%\bin\java.exe"
if exist %JAVA_EXE% goto init
echo ERROR: JAVA_HOME is set to an invalid directory: %JAVA_HOME%
goto fail

:init
if exist %WRAPPER_JAR% goto run

echo Downloading Maven wrapper jar...
powershell -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; (New-Object System.Net.WebClient).DownloadFile('https://repo.maven.apache.org/maven2/org/apache/maven/wrapper/maven-wrapper/3.2.0/maven-wrapper-3.2.0.jar', '%DIRNAME%\.mvn\wrapper\maven-wrapper.jar')"

:run
%JAVA_EXE% "-Dmaven.multiModuleProjectDirectory=%DIRNAME%" -classpath %WRAPPER_JAR% org.apache.maven.wrapper.MavenWrapperMain %*
if ERRORLEVEL 1 goto fail
goto end

:fail
exit /b 1

:end
exit /b 0
